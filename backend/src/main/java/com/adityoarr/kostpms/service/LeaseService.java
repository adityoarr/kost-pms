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
    private final OwnerContextService ownerContext;

    public LeaseService(JdbcTemplate jdbcTemplate, OwnerContextService ownerContext) {
        this.jdbcTemplate = jdbcTemplate;
        this.ownerContext = ownerContext;
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

    // Scope via tenant AND property (dua-duanya harus milik owner)
    private static final String SELECT_JOIN =
            "SELECT l.id, l.tenant_id, t.name AS tenant_name, t.phone AS tenant_phone, " +
            "       l.unit_id, u.unit_number, u.property_id, p.name AS property_name, " +
            "       l.start_date, l.end_date, l.monthly_rate, l.deposit, l.status, " +
            "       l.terminated_at, l.created_at " +
            "FROM leases l " +
            "JOIN tenants t ON l.tenant_id = t.id " +
            "JOIN units u ON l.unit_id = u.id " +
            "JOIN properties p ON u.property_id = p.id " +
            "WHERE t.owner_id = p.owner_id AND p.owner_id = ? ";

    public List<LeaseResponse> findAll() {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return List.of();
        return jdbcTemplate.query(SELECT_JOIN + "ORDER BY l.created_at DESC", mapper, ownerId);
    }

    public LeaseResponse findById(UUID id) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return null;
        List<LeaseResponse> rows = jdbcTemplate.query(SELECT_JOIN + "AND l.id = ?", mapper, ownerId, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    public LeaseResponse create(LeaseRequest req, String username) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) throw new IllegalStateException("Owner context tidak tersedia.");
        UUID tenantId = UUID.fromString(req.tenantId());
        UUID unitId = UUID.fromString(req.unitId());

        // 1) Tenant harus ada, aktif, DAN milik owner ini
        List<Map<String, Object>> tRows = jdbcTemplate.queryForList(
                "SELECT status FROM tenants WHERE id = ? AND owner_id = ?", tenantId, ownerId);
        if (tRows.isEmpty()) throw new IllegalArgumentException("Penyewa tidak ditemukan atau bukan milik Anda.");
        if (!"ACTIVE".equals(tRows.get(0).get("status")))
            throw new IllegalArgumentException("Penyewa ini tidak aktif, tidak bisa dibuatkan kontrak.");

        // 2) Kamar harus ada, KOSONG, DAN milik owner ini (via property)
        List<Map<String, Object>> uRows = jdbcTemplate.queryForList(
                "SELECT u.status, u.monthly_rate FROM units u " +
                "JOIN properties p ON u.property_id = p.id " +
                "WHERE u.id = ? AND p.owner_id = ?", unitId, ownerId);
        if (uRows.isEmpty()) throw new IllegalArgumentException("Kamar tidak ditemukan atau bukan milik Anda.");
        String unitStatus = (String) uRows.get(0).get("status");
        if (!"VACANT".equals(unitStatus))
            throw new IllegalArgumentException("Kamar sedang " + unitStatus + ", tidak bisa disewakan.");

        if (req.endDate() != null && req.endDate().isBefore(req.startDate()))
            throw new IllegalArgumentException("Tanggal selesai tidak boleh sebelum tanggal mulai.");

        long rate = (req.monthlyRate() != null) ? req.monthlyRate()
                : ((Number) uRows.get(0).get("monthly_rate")).longValue();
        long dep = (req.deposit() != null) ? req.deposit() : 0L;

        UUID id = UUID.randomUUID();
        try {
            jdbcTemplate.update(
                    "INSERT INTO leases (id, tenant_id, unit_id, start_date, end_date, monthly_rate, deposit, status, created_by_username, owner_id) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)",
                    id, tenantId, unitId, req.startDate(), req.endDate(), rate, dep, username, ownerId);
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw new IllegalArgumentException("Kamar ini baru saja terisi. Muat ulang dan coba lagi.");
        }

        jdbcTemplate.update("UPDATE units SET status='OCCUPIED', updated_at=now() WHERE id = ?", unitId);

        return findById(id);
    }

    @Transactional
    public LeaseResponse changeStatus(UUID id, String newStatus) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) throw new IllegalStateException("Owner context tidak tersedia.");
        if (!"ENDED".equals(newStatus) && !"CANCELLED".equals(newStatus))
            throw new IllegalArgumentException("Status penutupan harus ENDED atau CANCELLED.");

        // Ambil lease hanya jika milik owner (via tenant join)
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT l.status, l.unit_id FROM leases l " +
                "JOIN tenants t ON l.tenant_id = t.id " +
                "WHERE l.id = ? AND t.owner_id = ?", id, ownerId);
        if (rows.isEmpty()) throw new IllegalArgumentException("Kontrak tidak ditemukan atau bukan milik Anda.");
        if (!"ACTIVE".equals(rows.get(0).get("status")))
            throw new IllegalArgumentException("Kontrak ini sudah tidak aktif.");
        UUID unitId = (UUID) rows.get(0).get("unit_id");

        jdbcTemplate.update(
                "UPDATE leases SET status=?, terminated_at=now(), updated_at=now() WHERE id=? AND owner_id=?",
                newStatus, id, ownerId);

        jdbcTemplate.update(
                "UPDATE units SET status='VACANT', updated_at=now() WHERE id=? AND status='OCCUPIED'",
                unitId);

        return findById(id);
    }
}
