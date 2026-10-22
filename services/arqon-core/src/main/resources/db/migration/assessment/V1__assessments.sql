-- Assessment module (schema assessment). Config and sections are validated JSONB; questions are PINNED by (question_id, version).
-- A PUBLISHED assessment is frozen at the database level (trigger), so running exams can never change underneath candidates.

CREATE TABLE assessments (
    id                   UUID         PRIMARY KEY,
    tenant_id            UUID         NOT NULL,
    title                VARCHAR(300) NOT NULL,
    description          TEXT,
    status               VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    config               JSONB        NOT NULL,
    sections             JSONB        NOT NULL,
    revision             INT          NOT NULL DEFAULT 0,
    source_assessment_id UUID,
    created_by           UUID         NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_at         TIMESTAMPTZ,
    published_by         UUID,
    CONSTRAINT chk_assessments_status CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'))
);
CREATE INDEX idx_assessments_tenant_list ON assessments (tenant_id, status, updated_at DESC);

CREATE FUNCTION assessment.protect_published() RETURNS trigger AS $$
BEGIN
    IF OLD.status = 'PUBLISHED' AND (NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description
            OR NEW.config IS DISTINCT FROM OLD.config OR NEW.sections IS DISTINCT FROM OLD.sections) THEN
        RAISE EXCEPTION 'published assessments are immutable';
    END IF;
    IF OLD.status = 'PUBLISHED' AND NEW.status NOT IN ('PUBLISHED', 'ARCHIVED') THEN
        RAISE EXCEPTION 'published assessments cannot go back to draft';
    END IF;
    IF OLD.status = 'ARCHIVED' AND NEW.status <> 'ARCHIVED' THEN
        RAISE EXCEPTION 'archived assessments cannot be restored';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_assessments_protect BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION assessment.protect_published();

CREATE FUNCTION assessment.forbid_delete() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'assessments cannot be deleted, archive them instead';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_assessments_no_delete BEFORE DELETE ON assessments FOR EACH ROW EXECUTE FUNCTION assessment.forbid_delete();

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

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON assessments
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arqon_app') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA assessment TO arqon_app';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA assessment TO arqon_app';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA assessment GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arqon_app';
    END IF;
END $$;
