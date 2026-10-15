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
    private final OwnerContextService ownerContext;

    public TenantService(JdbcTemplate jdbcTemplate, OwnerContextService ownerContext) {
        this.jdbcTemplate = jdbcTemplate;
        this.ownerContext = ownerContext;
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
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return List.of();
        return jdbcTemplate.query("SELECT " + COLS + " FROM tenants WHERE owner_id = ? ORDER BY created_at DESC", mapper, ownerId);
    }

    public TenantResponse findById(UUID id) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return null;
        List<TenantResponse> rows = jdbcTemplate.query(
                "SELECT " + COLS + " FROM tenants WHERE id = ? AND owner_id = ?", mapper, id, ownerId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public TenantResponse create(TenantRequest req, String username) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) throw new IllegalStateException("Owner context tidak tersedia.");
        Integer dup = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tenants WHERE phone = ? AND status = 'ACTIVE' AND owner_id = ?",
                Integer.class, req.phone(), ownerId);
        if (dup != null && dup > 0) {
            throw new IllegalArgumentException("Nomor HP " + req.phone() + " sudah terdaftar sebagai penyewa aktif.");
        }
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO tenants (id, name, phone, nik, address, notes, status, created_by_username, owner_id) " +
                "VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)",
                id, req.name(), req.phone(), req.nik(), req.address(), req.notes(), username, ownerId);
        return findById(id);
    }

    public TenantResponse update(UUID id, TenantRequest req) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return null;
        Integer dup = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tenants WHERE phone = ? AND status = 'ACTIVE' AND id <> ? AND owner_id = ?",
                Integer.class, req.phone(), id, ownerId);
        if (dup != null && dup > 0) {
            throw new IllegalArgumentException("Nomor HP " + req.phone() + " sudah dipakai penyewa aktif lain.");
        }
        int updated = jdbcTemplate.update(
                "UPDATE tenants SET name=?, phone=?, nik=?, address=?, notes=?, updated_at=now() WHERE id=? AND owner_id=?",
                req.name(), req.phone(), req.nik(), req.address(), req.notes(), id, ownerId);
        return updated == 0 ? null : findById(id);
    }

    @Transactional
    public boolean archive(UUID id) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return false;
        Integer activeLeases = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM leases WHERE tenant_id = ? AND status = 'ACTIVE' AND owner_id = ?",
                Integer.class, id, ownerId);
        if (activeLeases != null && activeLeases > 0) {
            throw new IllegalStateException("Tenant ini masih punya kontrak hunian aktif. Akhiri kontraknya dulu.");
        }
        int updated = jdbcTemplate.update(
                "UPDATE tenants SET status='ARCHIVED', updated_at=now() WHERE id=? AND owner_id=? AND status <> 'ARCHIVED'",
                id, ownerId);
        return updated > 0;
    }

    public boolean resetPassword(UUID id) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return false;
        int updated = jdbcTemplate.update(
                "UPDATE tenants SET password_hash = NULL, updated_at = now() WHERE id = ? AND owner_id = ?",
                id, ownerId);
        return updated > 0;
    }
}
