-- Multi-tenant: tambah owner_id ke tabel inti.
-- Strategi: NULLABLE dulu, backfill, nanti tambah NOT NULL di 11.2d.

-- Tabel master data
ALTER TABLE properties ADD COLUMN owner_id UUID;
ALTER TABLE units ADD COLUMN owner_id UUID;
ALTER TABLE tenants ADD COLUMN owner_id UUID;
ALTER TABLE leases ADD COLUMN owner_id UUID;

-- Tabel keuangan
ALTER TABLE invoices ADD COLUMN owner_id UUID;
ALTER TABLE payments ADD COLUMN owner_id UUID;

-- Tabel kolaborasi
ALTER TABLE tickets ADD COLUMN owner_id UUID;

-- Tabel user (untuk owner/staff/tenant mapping)
ALTER TABLE users ADD COLUMN owner_id UUID;

-- Tabel audit & reminder
ALTER TABLE audit_logs ADD COLUMN owner_id UUID;
ALTER TABLE reminder_logs ADD COLUMN owner_id UUID;

-- Index untuk query scoping (nanti di 11.2b/c/d)
CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_units_owner ON units(owner_id);
CREATE INDEX idx_tenants_owner ON tenants(owner_id);
CREATE INDEX idx_leases_owner ON leases(owner_id);
CREATE INDEX idx_invoices_owner ON invoices(owner_id);
CREATE INDEX idx_tickets_owner ON tickets(owner_id);
CREATE INDEX idx_users_owner ON users(owner_id);

-- Helper view untuk debug (opsional, bisa dihapus nanti)
CREATE OR REPLACE VIEW v_owner_summary AS
SELECT 
    u.id AS owner_user_id,
    u.username,
    u.role,
    COUNT(DISTINCT p.id) AS property_count,
    COUNT(DISTINCT t.id) AS tenant_count,
    COUNT(DISTINCT i.id) AS invoice_count
FROM users u
LEFT JOIN properties p ON p.owner_id = u.id
LEFT JOIN tenants t ON t.owner_id = u.id
LEFT JOIN invoices i ON i.owner_id = u.id
WHERE u.role = 'SUPERADMIN'
GROUP BY u.id, u.username, u.role;
