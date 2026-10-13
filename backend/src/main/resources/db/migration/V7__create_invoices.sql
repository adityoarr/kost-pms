CREATE TABLE invoices (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id             UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
    period_start         DATE NOT NULL,
    period_end           DATE NOT NULL,
    due_date             DATE NOT NULL,
    base_amount          BIGINT NOT NULL,              -- snapshot monthlyRate lease saat generate
    discount             BIGINT NOT NULL DEFAULT 0,
    late_fee_rate_percent INTEGER NOT NULL DEFAULT 0,  -- snapshot aturan denda saat generate
    status               VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    void_reason          TEXT,
    created_by_username  VARCHAR(50),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_invoices_status CHECK (status IN ('OPEN','PARTIALLY_PAID','PAID','VOID')),
    CONSTRAINT chk_invoices_amounts CHECK (base_amount >= 0 AND discount >= 0),
    CONSTRAINT uq_invoices_lease_period UNIQUE (lease_id, period_start)
);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_lease  ON invoices (lease_id);