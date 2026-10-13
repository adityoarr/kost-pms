CREATE TABLE tickets (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    unit_id              UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    category             VARCHAR(30)  NOT NULL,
    title                VARCHAR(150) NOT NULL,
    description          TEXT,
    status               VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    assigned_to_username VARCHAR(50),
    resolved_at          TIMESTAMPTZ,
    resolution_note      TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_tickets_status CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED'))
);
CREATE INDEX idx_tickets_status ON tickets (status);
CREATE INDEX idx_tickets_tenant ON tickets (tenant_id);

ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('SUPERADMIN','ADMIN','STAFF'));
