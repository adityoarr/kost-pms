CREATE TABLE units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    unit_number     VARCHAR(20) NOT NULL,       -- Misal: "101", "A-2", "Lt.2 No.5"
    unit_type       VARCHAR(50) NOT NULL DEFAULT 'STANDARD', -- STANDARD, DELUXE, PREMIUM, dll
    capacity        INT NOT NULL DEFAULT 1,     -- Jumlah orang maks
    monthly_rate    BIGINT NOT NULL DEFAULT 0,  -- Harga bulanan dalam Rupiah (integer!)
    facilities      TEXT[],                     -- Array string: ['AC', 'Kamar Mandi Dalam', 'WiFi']
    status          VARCHAR(20) NOT NULL DEFAULT 'VACANT', -- VACANT, OCCUPIED, MAINTENANCE, BLOCKED
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Uniqueness: Nomor kamar harus unik DALAM SATU PROPERTI
    CONSTRAINT uq_property_unit UNIQUE (property_id, unit_number)
);

CREATE INDEX idx_units_property ON units (property_id);
CREATE INDEX idx_units_status ON units (status);