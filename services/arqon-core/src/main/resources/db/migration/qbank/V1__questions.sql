-- Question bank module (schema qbank). A question is a logical record; its content lives in IMMUTABLE versions
-- (assessments will reference question_id + version, so editing never changes an assessment already in use).

CREATE TABLE questions (
    id              UUID         PRIMARY KEY,
    tenant_id       UUID         NOT NULL,
    type            VARCHAR(20)  NOT NULL,
    title           VARCHAR(300) NOT NULL,           -- denormalised from the current version for listing/search
    difficulty      VARCHAR(10)  NOT NULL,
    tags            JSONB        NOT NULL DEFAULT '[]'::jsonb,
    current_version INT          NOT NULL DEFAULT 1,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_by      UUID         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_questions_type       CHECK (type IN ('MCQ','CODING')),
    CONSTRAINT chk_questions_difficulty CHECK (difficulty IN ('EASY','MEDIUM','HARD')),
    CONSTRAINT chk_questions_status     CHECK (status IN ('ACTIVE','ARCHIVED'))
);
CREATE INDEX idx_questions_tenant_list ON questions (tenant_id, status, updated_at DESC);
CREATE INDEX idx_questions_tags ON questions USING GIN (tags);

CREATE TABLE question_versions (
    id          UUID         PRIMARY KEY,
    question_id UUID         NOT NULL REFERENCES questions (id),
    tenant_id   UUID         NOT NULL,
    version     INT          NOT NULL,
    title       VARCHAR(300) NOT NULL,
    body        TEXT         NOT NULL,
    difficulty  VARCHAR(10)  NOT NULL,
    content     JSONB        NOT NULL,                -- MCQ options / coding spec incl. hidden test cases
    created_by  UUID         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_question_version UNIQUE (question_id, version)
);
CREATE INDEX idx_question_versions_tenant ON question_versions (tenant_id);

-- Versions are append-only at the database level too.
CREATE FUNCTION qbank.forbid_version_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'question_versions are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_question_versions_immutable BEFORE UPDATE OR DELETE ON question_versions
    FOR EACH ROW EXECUTE FUNCTION qbank.forbid_version_mutation();

CREATE TABLE outbox_events (
    id             UUID         PRIMARY KEY,
    tenant_id      UUID,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id   UUID         NOT NULL,
    event_type     VARCHAR(150) NOT NULL,
    event_version  INT          NOT NULL DEFAULT 1,
    correlation_id VARCHAR(64),
    payload        JSONB        NOT NULL,
    occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ,
    attempts       INT          NOT NULL DEFAULT 0
);
CREATE INDEX idx_outbox_unpublished ON outbox_events (occurred_at) WHERE published_at IS NULL;
CREATE TABLE processed_events (
    event_id     UUID         NOT NULL,
    consumer     VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, consumer)
);

ALTER TABLE questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON questions
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation ON question_versions
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arqon_app') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA qbank TO arqon_app';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA qbank TO arqon_app';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA qbank GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arqon_app';
    END IF;
END $$;
