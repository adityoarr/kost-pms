ALTER TABLE properties ADD COLUMN payment_bank            VARCHAR(50);
ALTER TABLE properties ADD COLUMN payment_account_number  VARCHAR(50);
ALTER TABLE properties ADD COLUMN payment_account_holder  VARCHAR(100);
ALTER TABLE properties ADD COLUMN payment_notes           TEXT;
