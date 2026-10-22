-- Exam module (schema exam). One session per invitation. The server owns the clock (deadline_at) and holds the full
-- question snapshot (including answers); candidates only ever receive a stripped view.

CREATE TABLE exam_sessions (
    id              UUID         PRIMARY KEY,
    tenant_id       UUID         NOT NULL,
    invitation_id   UUID         NOT NULL,
    assessment_id   UUID         NOT NULL,
    candidate_email VARCHAR(254) NOT NULL,
    token_hash      VARCHAR(64)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS',
    started_at      TIMESTAMPTZ  NOT NULL,
    deadline_at     TIMESTAMPTZ  NOT NULL,
    submitted_at    TIMESTAMPTZ,
    snapshot        JSONB        NOT NULL,
    result          JSONB,
    CONSTRAINT chk_exam_status CHECK (status IN ('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED'))
);
CREATE UNIQUE INDEX uq_exam_invitation ON exam_sessions (invitation_id);
CREATE UNIQUE INDEX uq_exam_token_hash ON exam_sessions (token_hash);
CREATE INDEX idx_exam_assessment ON exam_sessions (tenant_id, assessment_id, started_at DESC);
CREATE INDEX idx_exam_open_deadline ON exam_sessions (deadline_at) WHERE status = 'IN_PROGRESS';

CREATE TABLE exam_answers (
    session_id  UUID        NOT NULL REFERENCES exam_sessions (id),
    question_id UUID        NOT NULL,
    tenant_id   UUID        NOT NULL,
    answer      JSONB       NOT NULL,
    saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id, question_id)
);

CREATE TABLE audit_events (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID,
    actor_id       UUID,
    action         VARCHAR(100) NOT NULL,
    target         VARCHAR(200),
    correlation_id VARCHAR(64),
    ip             VARCHAR(64),
    metadata       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_exam_audit_tenant_time ON audit_events (tenant_id, occurred_at);

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
CREATE INDEX idx_exam_outbox_unpublished ON outbox_events (occurred_at) WHERE published_at IS NULL;
CREATE TABLE processed_events (
    event_id     UUID         NOT NULL,
    consumer     VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, consumer)
);

-- A finished session can never be changed again (also protects against a buggy service).
CREATE FUNCTION exam.protect_finished() RETURNS trigger AS $$
BEGIN
    IF OLD.status <> 'IN_PROGRESS' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
            OR NEW.result IS DISTINCT FROM OLD.result OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
            OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at) THEN
        RAISE EXCEPTION 'finished exam sessions are immutable';
    END IF;
    IF NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
        RAISE EXCEPTION 'snapshot, deadline and start time are fixed once the session exists';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_exam_sessions_protect BEFORE UPDATE ON exam_sessions FOR EACH ROW EXECUTE FUNCTION exam.protect_finished();

CREATE FUNCTION exam.protect_answers() RETURNS trigger AS $$
BEGIN
    IF (SELECT status FROM exam.exam_sessions WHERE id = COALESCE(NEW.session_id, OLD.session_id)) <> 'IN_PROGRESS' THEN
        RAISE EXCEPTION 'answers of a finished session cannot change';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_exam_answers_protect BEFORE INSERT OR UPDATE OR DELETE ON exam_answers FOR EACH ROW EXECUTE FUNCTION exam.protect_answers();

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events  ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON exam_sessions
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation ON exam_answers
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation ON audit_events
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arqon_app') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA exam TO arqon_app';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA exam TO arqon_app';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA exam GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arqon_app';
    END IF;
END $$;
