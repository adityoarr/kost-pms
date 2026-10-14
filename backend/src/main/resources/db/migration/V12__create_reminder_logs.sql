CREATE TABLE reminder_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    kind        VARCHAR(20) NOT NULL,
    channel     VARCHAR(30) NOT NULL,
    message     TEXT NOT NULL,
    amount_due  BIGINT NOT NULL,          -- snapshot totalDue saat dikirim
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uniq_reminder_invoice_kind UNIQUE (invoice_id, kind),
    CONSTRAINT chk_reminder_kind CHECK (kind IN ('DUE_SOON','OVERDUE'))
);
CREATE INDEX idx_reminder_sent ON reminder_logs (sent_at DESC);
