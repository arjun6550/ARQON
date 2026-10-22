-- Invitation module (schema invitation). Only the SHA-256 of the invitation token is stored; the raw token exists
-- only in the e-mailed link. At most one non-revoked invitation per (assessment, candidate e-mail).

CREATE TABLE invitations (
    id              UUID         PRIMARY KEY,
    tenant_id       UUID         NOT NULL,
    assessment_id   UUID         NOT NULL,
    candidate_email VARCHAR(254) NOT NULL,
    token_hash      VARCHAR(64)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    email_status    VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    send_count      INT          NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ  NOT NULL,
    created_by      UUID         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    opened_at       TIMESTAMPTZ,
    last_sent_at    TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    CONSTRAINT chk_invitations_status CHECK (status IN ('PENDING','OPENED','REVOKED')),
    CONSTRAINT chk_invitations_email_status CHECK (email_status IN ('PENDING','SENT','FAILED')),
    CONSTRAINT chk_invitations_email_lower CHECK (candidate_email = lower(candidate_email))
);
CREATE UNIQUE INDEX uq_invitations_token_hash ON invitations (token_hash);
CREATE UNIQUE INDEX uq_invitations_active ON invitations (tenant_id, assessment_id, candidate_email) WHERE status <> 'REVOKED';
CREATE INDEX idx_invitations_assessment ON invitations (tenant_id, assessment_id, created_at DESC);

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
CREATE INDEX idx_inv_audit_tenant_time ON audit_events (tenant_id, occurred_at);

-- Transactional outbox (relay to Kafka comes later). Payloads NEVER contain the raw token.
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
CREATE INDEX idx_inv_outbox_unpublished ON outbox_events (occurred_at) WHERE published_at IS NULL;
CREATE TABLE processed_events (
    event_id     UUID         NOT NULL,
    consumer     VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, consumer)
);

ALTER TABLE invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invitations
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation ON audit_events
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arqon_app') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA invitation TO arqon_app';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA invitation TO arqon_app';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA invitation GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arqon_app';
    END IF;
END $$;
