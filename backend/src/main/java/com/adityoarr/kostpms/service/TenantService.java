package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.TenantRequest;
import com.adityoarr.kostpms.dto.TenantResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class TenantService {

    private final JdbcTemplate jdbcTemplate;

    public TenantService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<TenantResponse> mapper = (rs, n) -> new TenantResponse(
            rs.getString("id"),
            rs.getString("name"),
            rs.getString("phone"),
            rs.getString("nik"),
            rs.getString("address"),
            rs.getString("notes"),
            rs.getString("status"),
            rs.getString("created_by_username"),
            rs.getObject("created_at", java.time.OffsetDateTime.class)
    );

    private static final String COLS =
            "id, name, phone, nik, address, notes, status, created_by_username, created_at";

    public List<TenantResponse> findAll() {
        return jdbcTemplate.query("SELECT " + COLS + " FROM tenants ORDER BY created_at DESC", mapper);
    }

    public TenantResponse findById(UUID id) {
        List<TenantResponse> rows = jdbcTemplate.query(
                "SELECT " + COLS + " FROM tenants WHERE id = ?", mapper, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public TenantResponse create(TenantRequest req, String username) {
        Integer dup = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tenants WHERE phone = ? AND status = 'ACTIVE'",
                Integer.class, req.phone());
        if (dup != null && dup > 0) {
            throw new IllegalArgumentException("Nomor HP " + req.phone() + " sudah terdaftar sebagai penyewa aktif.");
        }
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO tenants (id, name, phone, nik, address, notes, status, created_by_username) " +
                "VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
                id, req.name(), req.phone(), req.nik(), req.address(), req.notes(), username);
        return findById(id);
    }

    public TenantResponse update(UUID id, TenantRequest req) {
        Integer dup = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tenants WHERE phone = ? AND status = 'ACTIVE' AND id <> ?",
                Integer.class, req.phone(), id);
        if (dup != null && dup > 0) {
            throw new IllegalArgumentException("Nomor HP " + req.phone() + " sudah dipakai penyewa aktif lain.");
        }
        int updated = jdbcTemplate.update(
                "UPDATE tenants SET name=?, phone=?, nik=?, address=?, notes=?, updated_at=now() WHERE id=?",
                req.name(), req.phone(), req.nik(), req.address(), req.notes(), id);
        return updated == 0 ? null : findById(id);
    }

    @Transactional
    public boolean archive(UUID id) {
        Integer activeLeases = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM leases WHERE tenant_id = ? AND status = 'ACTIVE'",
                Integer.class, id);
        if (activeLeases != null && activeLeases > 0) {
            throw new IllegalStateException("Tenant ini masih punya kontrak hunian aktif. Akhiri kontraknya dulu.");
        }
        int updated = jdbcTemplate.update(
                "UPDATE tenants SET status='ARCHIVED', updated_at=now() WHERE id=? AND status <> 'ARCHIVED'",
                id);
        return updated > 0;
    }

    // Reset manual oleh owner/admin: hapus password -> tenant bisa buat ulang saat login berikutnya.
    public boolean resetPassword(UUID id) {
        int updated = jdbcTemplate.update(
                "UPDATE tenants SET password_hash = NULL, updated_at = now() WHERE id = ?", id);
        return updated > 0;
    }
}