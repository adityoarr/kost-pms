CREATE TABLE leases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    unit_id             UUID NOT NULL REFERENCES units(id)   ON DELETE RESTRICT,
    start_date          DATE   NOT NULL,
    end_date            DATE,                            -- nullable = sampai dibatalkan
    monthly_rate        BIGINT NOT NULL DEFAULT 0,       -- SNAPSHOT harga saat kontrak dibuat
    deposit             BIGINT NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    terminated_at       TIMESTAMPTZ,                     -- kapan sebenarnya berakhir/dibatalkan
    created_by_username VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_leases_status CHECK (status IN ('ACTIVE','ENDED','CANCELLED')),
    CONSTRAINT chk_leases_dates  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Satu kamar hanya boleh punya SATU kontrak aktif (menutup race condition di level DB).
CREATE UNIQUE INDEX uq_leases_unit_active ON leases (unit_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_leases_tenant ON leases (tenant_id);
CREATE INDEX idx_leases_status ON leases (status);