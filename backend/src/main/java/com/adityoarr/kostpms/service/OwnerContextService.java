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
     * Untuk SUPERADMIN/ADMIN/STAFF: return owner_id mereka sendiri (atau null jika belum di-set).
     * Untuk TENANT: return owner_id dari tenant mereka.
     * 
     * Di fase 11.2a, semua user punya owner_id = user SUPERADMIN pertama (backfill).
     * Di fase 11.2d (onboarding owner baru), owner_id akan berbeda per owner.
     */
    public UUID getCurrentOwnerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        String username = auth.getName();
        String roles = auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .reduce("", (a, b) -> a + "," + b);

        // Cari user di tabel users
        List<Map<String, Object>> userRows = jdbc.queryForList(
                "SELECT id, owner_id FROM users WHERE username = ?", username);
        
        if (!userRows.isEmpty()) {
            // Ini owner/staff/admin user
            Object ownerId = userRows.get(0).get("owner_id");
            return ownerId != null ? UUID.fromString(String.valueOf(ownerId)) : null;
        }

        // Kalau bukan di users, cek apakah ini tenant (phone number)
        List<Map<String, Object>> tenantRows = jdbc.queryForList(
                "SELECT owner_id FROM tenants WHERE phone = ?", username);
        if (!tenantRows.isEmpty()) {
            Object ownerId = tenantRows.get(0).get("owner_id");
            return ownerId != null ? UUID.fromString(String.valueOf(ownerId)) : null;
        }

        return null;
    }

    /**
     * Helper untuk testing: set owner_id untuk user tertentu.
     * Hanya dipakai di test/backfill script, bukan di production code.
     */
    public void setOwnerIdForUser(String username, UUID ownerId) {
        jdbc.update("UPDATE users SET owner_id = ? WHERE username = ?", ownerId, username);
    }
}
