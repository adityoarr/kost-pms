package com.adityoarr.kostpms.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OwnerContextService {

    private final JdbcTemplate jdbc;

    public OwnerContextService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Ambil owner_id dari current user.
     * - SUPERADMIN/ADMIN/STAFF: principal = username -> owner_id dari tabel users.
     * - TENANT: principal = UUID tenant (lihat TenantAuthController.buildAuth)
     *   -> owner_id dari tabel tenants.
     * Return null jika tidak ada sesi (mis. thread scheduler).
     */
    public UUID getCurrentOwnerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        String name = auth.getName();
        if (name == null || name.isBlank()) {
            return null;
        }

        boolean isTenant = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_TENANT".equals(a.getAuthority()));

        if (isTenant) {
            // FIX A2: sesi tenant memakai UUID tenant sebagai principal, bukan nomor HP.
            UUID tenantId;
            try {
                tenantId = UUID.fromString(name);
            } catch (IllegalArgumentException e) {
                return null;
            }
            List<Map<String, Object>> tenantRows = jdbc.queryForList(
                    "SELECT owner_id FROM tenants WHERE id = ?", tenantId);
            if (tenantRows.isEmpty()) return null;
            Object ownerId = tenantRows.get(0).get("owner_id");
            return ownerId != null ? UUID.fromString(String.valueOf(ownerId)) : null;
        }

        List<Map<String, Object>> userRows = jdbc.queryForList(
                "SELECT owner_id FROM users WHERE username = ?", name);
        if (userRows.isEmpty()) return null;
        Object ownerId = userRows.get(0).get("owner_id");
        return ownerId != null ? UUID.fromString(String.valueOf(ownerId)) : null;
    }

    /**
     * Helper untuk testing: set owner_id untuk user tertentu.
     * Hanya dipakai di test/backfill script, bukan di production code.
     */
    public void setOwnerIdForUser(String username, UUID ownerId) {
        jdbc.update("UPDATE users SET owner_id = ? WHERE username = ?", ownerId, username);
    }
}