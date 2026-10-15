package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.UserCreateRequest;
import com.adityoarr.kostpms.dto.UserListItemResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class OwnerOnboardingService {

    private static final Pattern PW_RULE = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;

    public OwnerOnboardingService(JdbcTemplate jdbc, PasswordEncoder encoder) {
        this.jdbc = jdbc;
        this.encoder = encoder;
    }

    /**
     * Onboard owner baru: buat user SUPERADMIN pertama untuk organisasi baru.
     * owner_id user ini = user_id mereka sendiri (circular reference yang valid).
     * Setelah ini, owner baru bisa create staff/admin/tenant/property sendiri.
     */
    public UserListItemResponse onboardOwner(String username, String fullName, String password) {
        if (!PW_RULE.matcher(password).matches()) {
            throw new IllegalArgumentException("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
        }
        // Cek duplikat username global (karena ini owner pertama, belum ada owner_id)
        Integer dup = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE username = ?",
                Integer.class, username);
        if (dup != null && dup > 0) {
            throw new IllegalArgumentException("Username sudah dipakai.");
        }

        UUID userId = UUID.randomUUID();
        // owner_id = user_id (circular reference untuk SUPERADMIN pertama)
        jdbc.update(
                "INSERT INTO users (id, username, full_name, password_hash, role, status, owner_id) " +
                "VALUES (?, ?, ?, ?, 'SUPERADMIN', 'ACTIVE', ?)",
                userId, username, fullName, encoder.encode(password), userId);

        List<UserListItemResponse> rows = jdbc.query(
                "SELECT id, username, full_name, role, status, created_at FROM users WHERE id = ?",
                (rs, n) -> new UserListItemResponse(
                        rs.getString("id"),
                        rs.getString("username"),
                        rs.getString("full_name"),
                        rs.getString("role"),
                        rs.getString("status"),
                        rs.getObject("created_at", java.time.OffsetDateTime.class)
                ),
                userId);
        return rows.get(0);
    }

    /**
     * List semua owner (SUPERADMIN pertama per organisasi).
     * Hanya bisa dipanggil oleh SUPERADMIN existing (untuk admin panel).
     */
    public List<Map<String, Object>> listOwners() {
        return jdbc.queryForList(
                "SELECT id, username, full_name, created_at FROM users " +
                "WHERE role = 'SUPERADMIN' AND owner_id = id " +
                "ORDER BY created_at DESC");
    }
}
