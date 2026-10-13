CREATE TABLE tenants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(150) NOT NULL,
    phone               VARCHAR(20)  NOT NULL,          -- format E.164, misal +62812xxxx
    nik                 VARCHAR(30),
    address             TEXT,
    notes               TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_by_username VARCHAR(50),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_tenants_status CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED'))
);

-- Nomor HP unik HANYA di antara yang aktif; yang diarsip boleh dipakai ulang.
CREATE UNIQUE INDEX uq_tenants_phone_active ON tenants (phone) WHERE status = 'ACTIVE';
CREATE INDEX idx_tenants_status ON tenants (status);