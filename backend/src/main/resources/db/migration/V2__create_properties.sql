CREATE TABLE properties (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(150) NOT NULL,
    address             TEXT         NOT NULL,
    city                VARCHAR(100) NOT NULL,
    province            VARCHAR(100),
    phone               VARCHAR(30),
    status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_by_username VARCHAR(50),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_status ON properties (status);