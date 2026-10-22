-- Organization service baseline: organizations (tenant root), outbox/processed tables, Row-Level Security.

CREATE TABLE organizations (
    id         UUID         PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    slug       VARCHAR(50)  NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by UUID,
    CONSTRAINT chk_org_status CHECK (status IN ('ACTIVE','SUSPENDED'))
);
CREATE UNIQUE INDEX uq_organizations_slug ON organizations (slug);

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

-- The organization row itself is the tenant: a tenant may only see the row whose id equals its tenant id.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizations
    USING      (current_setting('app.system', true) = 'on' OR id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (current_setting('app.system', true) = 'on' OR id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arqon_app') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA org TO arqon_app';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA org TO arqon_app';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA org GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arqon_app';
    END IF;
END $$;
