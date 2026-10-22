-- Slice 1.1: users, refresh tokens, audit trail + Row-Level Security (ADR-0004).
-- RLS reads two transaction-scoped settings: app.tenant_id (normal access) and app.system ('on' = platform access).
-- If neither is set the policies match nothing (fail closed).

CREATE TABLE users (
    id              UUID         PRIMARY KEY,
    tenant_id       UUID,
    email           VARCHAR(320) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(30)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    failed_attempts INT          NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by      UUID,
    CONSTRAINT chk_users_role CHECK (role IN ('SUPER_ADMIN','ORG_ADMIN','RECRUITER','PROCTOR','CANDIDATE')),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE','DISABLED')),
    CONSTRAINT chk_users_tenant_role CHECK (
        (role = 'SUPER_ADMIN' AND tenant_id IS NULL) OR (role <> 'SUPER_ADMIN' AND tenant_id IS NOT NULL))
);
CREATE UNIQUE INDEX uq_users_email ON users (lower(email));
CREATE INDEX idx_users_tenant ON users (tenant_id, created_at);

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users (id),
    tenant_id   UUID,
    family_id   UUID        NOT NULL,
    session_id  UUID        NOT NULL,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    rotated_at  TIMESTAMPTZ,
    revoked_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_refresh_token_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_family ON refresh_tokens (family_id);

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
CREATE INDEX idx_audit_tenant_time ON audit_events (tenant_id, occurred_at);

ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events   ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation ON refresh_tokens
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation ON audit_events
    USING      (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- The runtime role (arqon_app) is NOT the table owner, NOT superuser and NOT BYPASSRLS, so RLS applies to it.
-- Migrations run as the owner role. The role is created by infra (compose init script / Terraform).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arqon_app') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA identity TO arqon_app';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO arqon_app';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arqon_app';
    END IF;
END $$;
