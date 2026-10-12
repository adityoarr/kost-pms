package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.UnitRequest;
import com.adityoarr.kostpms.dto.UnitResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class UnitService {

    private final JdbcTemplate jdbcTemplate;

    public UnitService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<UnitResponse> mapper = (rs, rowNum) -> new UnitResponse(
            rs.getString("id"),
            rs.getString("property_id"),
            rs.getString("property_name"),
            rs.getString("unit_number"),
            rs.getString("unit_type"),
            rs.getInt("capacity"),
            rs.getLong("monthly_rate"),
            Arrays.asList(rs.getArray("facilities") != null ? (String[]) rs.getArray("facilities").getArray() : new String[0]),
            rs.getString("status")
    );

    // Query gabungan: ambil unit beserta nama propertinya
    private static final String SELECT_JOIN = 
        "SELECT u.id, u.property_id, p.name as property_name, u.unit_number, u.unit_type, " +
        "u.capacity, u.monthly_rate, u.facilities, u.status " +
        "FROM units u JOIN properties p ON u.property_id = p.id ";

    public List<UnitResponse> findByProperty(UUID propertyId) {
        return jdbcTemplate.query(SELECT_JOIN + "WHERE u.property_id = ? ORDER BY u.unit_number ASC", mapper, propertyId);
    }

    public UnitResponse findById(UUID id) {
        List<UnitResponse> rows = jdbcTemplate.query(SELECT_JOIN + "WHERE u.id = ?", mapper, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public UnitResponse create(UnitRequest req) throws Exception {
        UUID id = UUID.randomUUID();
        UUID propId = UUID.fromString(req.propertyId());
        
        // Validasi: Pastikan properti ada dan aktif
        Integer propCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM properties WHERE id = ? AND status = 'ACTIVE'", Integer.class, propId);
        if (propCount == 0) throw new IllegalArgumentException("Properti tidak ditemukan atau tidak aktif");

        // Default values jika kosong
        String type = (req.unitType() != null && !req.unitType().isBlank()) ? req.unitType() : "STANDARD";
        int cap = (req.capacity() != null) ? req.capacity() : 1;
        long rate = (req.monthlyRate() != null) ? req.monthlyRate() : 0;
        String stat = (req.status() != null && !req.status().isBlank()) ? req.status() : "VACANT";
        String[] facs = (req.facilities() != null) ? req.facilities().toArray(new String[0]) : new String[0];

        try {
            jdbcTemplate.update(
                "INSERT INTO units (id, property_id, unit_number, unit_type, capacity, monthly_rate, facilities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                id, propId, req.unitNumber(), type, cap, rate, facs, stat
            );
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw new IllegalArgumentException("Nomor kamar '" + req.unitNumber() + "' sudah ada di properti ini");
        }

        return findById(id);
    }

    public UnitResponse update(UUID id, UnitRequest req) throws Exception {
        int updated = jdbcTemplate.update(
            "UPDATE units SET unit_number=?, unit_type=?, capacity=?, monthly_rate=?, facilities=?, status=?, updated_at=now() WHERE id=?",
            req.unitNumber(),
            (req.unitType() != null) ? req.unitType() : "STANDARD",
            (req.capacity() != null) ? req.capacity() : 1,
            (req.monthlyRate() != null) ? req.monthlyRate() : 0,
            (req.facilities() != null) ? req.facilities().toArray(new String[0]) : new String[0],
            (req.status() != null) ? req.status() : "VACANT",
            id
        );
        return updated == 0 ? null : findById(id);
    }

    public boolean delete(UUID id) {
        // Soft delete? Untuk unit, biasanya hard delete allowed jika belum ada tenant.
        // Tapi karena FK constraint ON DELETE RESTRICT di DB, kita coba delete biasa dulu.
        // Jika gagal karena ada referensi lain (tenant), nanti kita tangani di Fase Tenant.
        // Untuk MVP Unit, kita izinkan hard delete selama belum ada kontrak.
        int deleted = jdbcTemplate.update("DELETE FROM units WHERE id = ?", id);
        return deleted > 0;
    }
}