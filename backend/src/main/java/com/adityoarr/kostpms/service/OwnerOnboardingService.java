package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.OwnerSummaryResponse;
import com.adityoarr.kostpms.dto.UserListItemResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
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

    // Onboard owner baru: SUPERADMIN pertama untuk organisasi baru (owner_id = id sendiri).
    public UserListItemResponse onboardOwner(String username, String fullName, String password) {
        if (!PW_RULE.matcher(password).matches()) {
            throw new IllegalArgumentException("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
        }
        Integer dup = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, username);
        if (dup != null && dup > 0) {
            throw new IllegalArgumentException("Username sudah dipakai.");
        }
        UUID userId = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO users (id, username, full_name, password_hash, role, status, owner_id) " +
                "VALUES (?, ?, ?, ?, 'SUPERADMIN', 'ACTIVE', ?)",
                userId, username, fullName, encoder.encode(password), userId);
        List<UserListItemResponse> rows = jdbc.query(
                "SELECT id, username, full_name, role, status, created_at FROM users WHERE id = ?",
                (rs, n) -> new UserListItemResponse(
                        rs.getString("id"), rs.getString("username"), rs.getString("full_name"),
                        rs.getString("role"), rs.getString("status"),
                        rs.getObject("created_at", OffsetDateTime.class)),
                userId);
        return rows.get(0);
    }

    // Daftar owner (SUPERADMIN dengan owner_id = id). camelCase, konsisten dengan sisa API.
    public List<OwnerSummaryResponse> listOwners() {
        return jdbc.query(
                "SELECT id, username, full_name, created_at FROM users " +
                "WHERE role = 'SUPERADMIN' AND owner_id = id ORDER BY created_at DESC",
                (rs, n) -> new OwnerSummaryResponse(
                        rs.getString("id"),
                        rs.getString("username"),
                        rs.getString("full_name"),
                        rs.getObject("created_at", OffsetDateTime.class)));
    }
}
