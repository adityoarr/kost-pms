CREATE TABLE payments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id           UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount               BIGINT NOT NULL,              -- positif = pembayaran; negatif = adjustment/refund
    method               VARCHAR(20) NOT NULL,         -- CASH | TRANSFER | OTHER | ADJUSTMENT
    reference            TEXT,
    paid_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_adjustment        BOOLEAN NOT NULL DEFAULT false,
    received_by_username VARCHAR(50),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_payments_amount_nonzero CHECK (amount <> 0)
);
CREATE INDEX idx_payments_invoice ON payments (invoice_id);