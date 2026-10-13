package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.LeaseRequest;
import com.adityoarr.kostpms.dto.LeaseResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class LeaseService {

    private final JdbcTemplate jdbcTemplate;

    public LeaseService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<LeaseResponse> mapper = (rs, n) -> new LeaseResponse(
            rs.getString("id"),
            rs.getString("tenant_id"),
            rs.getString("tenant_name"),
            rs.getString("tenant_phone"),
            rs.getString("unit_id"),
            rs.getString("unit_number"),
            rs.getString("property_id"),
            rs.getString("property_name"),
            rs.getObject("start_date", LocalDate.class),
            rs.getObject("end_date", LocalDate.class),
            rs.getLong("monthly_rate"),
            rs.getLong("deposit"),
            rs.getString("status"),
            rs.getObject("terminated_at", java.time.OffsetDateTime.class),
            rs.getObject("created_at", java.time.OffsetDateTime.class)
    );

    private static final String SELECT_JOIN =
            "SELECT l.id, l.tenant_id, t.name AS tenant_name, t.phone AS tenant_phone, " +
            "       l.unit_id, u.unit_number, u.property_id, p.name AS property_name, " +
            "       l.start_date, l.end_date, l.monthly_rate, l.deposit, l.status, " +
            "       l.terminated_at, l.created_at " +
            "FROM leases l " +
            "JOIN tenants t ON l.tenant_id = t.id " +
            "JOIN units u ON l.unit_id = u.id " +
            "JOIN properties p ON u.property_id = p.id ";

    public List<LeaseResponse> findAll() {
        return jdbcTemplate.query(SELECT_JOIN + "ORDER BY l.created_at DESC", mapper);
    }

    public LeaseResponse findById(UUID id) {
        List<LeaseResponse> rows = jdbcTemplate.query(SELECT_JOIN + "WHERE l.id = ?", mapper, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    public LeaseResponse create(LeaseRequest req, String username) {
        UUID tenantId = UUID.fromString(req.tenantId());
        UUID unitId = UUID.fromString(req.unitId());

        // 1) Tenant harus ada & aktif.
        List<Map<String, Object>> tRows = jdbcTemplate.queryForList(
                "SELECT status FROM tenants WHERE id = ?", tenantId);
        if (tRows.isEmpty()) throw new IllegalArgumentException("Penyewa tidak ditemukan.");
        if (!"ACTIVE".equals(tRows.get(0).get("status")))
            throw new IllegalArgumentException("Penyewa ini tidak aktif, tidak bisa dibuatkan kontrak.");

        // 2) Kamar harus ada & KOSONG (tolak MAINTENANCE/BLOCKED/OCCUPIED).
        List<Map<String, Object>> uRows = jdbcTemplate.queryForList(
                "SELECT status, monthly_rate FROM units WHERE id = ?", unitId);
        if (uRows.isEmpty()) throw new IllegalArgumentException("Kamar tidak ditemukan.");
        String unitStatus = (String) uRows.get(0).get("status");
        if (!"VACANT".equals(unitStatus))
            throw new IllegalArgumentException("Kamar sedang " + unitStatus + ", tidak bisa disewakan.");

        // 3) Validasi tanggal.
        if (req.endDate() != null && req.endDate().isBefore(req.startDate()))
            throw new IllegalArgumentException("Tanggal selesai tidak boleh sebelum tanggal mulai.");

        // 4) Snapshot harga: pakai yang dikirim, atau ambil tarif kamar saat ini.
        long rate = (req.monthlyRate() != null) ? req.monthlyRate()
                : ((Number) uRows.get(0).get("monthly_rate")).longValue();
        long dep = (req.deposit() != null) ? req.deposit() : 0L;

        // 5) INSERT kontrak aktif.
        UUID id = UUID.randomUUID();
        try {
            jdbcTemplate.update(
                    "INSERT INTO leases (id, tenant_id, unit_id, start_date, end_date, monthly_rate, deposit, status, created_by_username) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
                    id, tenantId, unitId, req.startDate(), req.endDate(), rate, dep, username);
        } catch (org.springframework.dao.DuplicateKeyException e) {
            // Penutup race condition: kamar baru saja terisi oleh request lain.
            throw new IllegalArgumentException("Kamar ini baru saja terisi. Muat ulang dan coba lagi.");
        }

        // 6) OTOMATIS: kamar jadi OCCUPIED.
        jdbcTemplate.update("UPDATE units SET status='OCCUPIED', updated_at=now() WHERE id = ?", unitId);

        return findById(id);
    }

    @Transactional
    public LeaseResponse changeStatus(UUID id, String newStatus) {
        if (!"ENDED".equals(newStatus) && !"CANCELLED".equals(newStatus))
            throw new IllegalArgumentException("Status penutupan harus ENDED atau CANCELLED.");

        // Ambil lease + unit_id, pastikan masih aktif.
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT status, unit_id FROM leases WHERE id = ?", id);
        if (rows.isEmpty()) throw new IllegalArgumentException("Kontrak tidak ditemukan.");
        if (!"ACTIVE".equals(rows.get(0).get("status")))
            throw new IllegalArgumentException("Kontrak ini sudah tidak aktif.");
        UUID unitId = (UUID) rows.get(0).get("unit_id");

        // 1) Tandai kontrak selesai/dibatalkan + catat waktu sebenarnya.
        jdbcTemplate.update(
                "UPDATE leases SET status=?, terminated_at=now(), updated_at=now() WHERE id=?",
                newStatus, id);

        // 2) OTOMATIS: kamar kembali VACANT (hanya jika memang masih OCCUPIED,
        //    agar tidak menimpa status manual MAINTENANCE/BLOCKED).
        jdbcTemplate.update(
                "UPDATE units SET status='VACANT', updated_at=now() WHERE id=? AND status='OCCUPIED'",
                unitId);

        return findById(id);
    }
}