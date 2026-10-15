ALTER TABLE reminder_logs DROP CONSTRAINT chk_reminder_kind;
ALTER TABLE reminder_logs ADD CONSTRAINT chk_reminder_kind
    CHECK (kind IN ('DUE_EARLY','DUE_SOON','DUE_URGENT','OVERDUE'));
