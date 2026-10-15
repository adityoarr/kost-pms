-- Lock-down: owner_id wajib ada di semua tabel multi-tenant.
-- Ini memastikan tidak ada data "orphan" (tanpa owner) yang bisa bocor.

-- Master data
ALTER TABLE properties ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE units ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE tenants ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE leases ALTER COLUMN owner_id SET NOT NULL;

-- Keuangan
ALTER TABLE invoices ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN owner_id SET NOT NULL;

-- Tiket
ALTER TABLE tickets ALTER COLUMN owner_id SET NOT NULL;

-- Users
ALTER TABLE users ALTER COLUMN owner_id SET NOT NULL;

-- Audit & reminder
ALTER TABLE audit_logs ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE reminder_logs ALTER COLUMN owner_id SET NOT NULL;

-- Tambah index unik untuk username per owner (mencegah username duplikat dalam satu organisasi)
CREATE UNIQUE INDEX idx_users_username_owner ON users(username, owner_id);
