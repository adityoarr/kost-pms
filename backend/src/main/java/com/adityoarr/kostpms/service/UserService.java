package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.UserCreateRequest;
import com.adityoarr.kostpms.dto.UserUpdateRequest;
import com.adityoarr.kostpms.dto.UserListItemResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class UserService {

    private static final Pattern PW_RULE = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");
    private static final Set<String> CREATABLE_ROLES = Set.of("STAFF", "ADMIN");

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final OwnerContextService ownerContext;

    public UserService(JdbcTemplate jdbc, PasswordEncoder encoder, OwnerContextService ownerContext) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.ownerContext = ownerContext;
    }

    private final RowMapper<UserListItemResponse> mapper = (rs, n) -> new UserListItemResponse(
            rs.getString("id"),
            rs.getString("username"),
            rs.getString("full_name"),
            rs.getString("role"),
            rs.getString("status"),
            rs.getObject("created_at", OffsetDateTime.class)
    );

    public List<UserListItemResponse> findAll() {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return List.of();
        return jdbc.query(
                "SELECT id, username, full_name, role, status, created_at FROM users WHERE owner_id = ? ORDER BY created_at",
                mapper, ownerId);
    }

    public UserListItemResponse create(UserCreateRequest req) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) throw new IllegalStateException("Owner context tidak tersedia.");
        if (!CREATABLE_ROLES.contains(req.role())) {
            throw new IllegalArgumentException("Role hanya boleh STAFF atau ADMIN.");
        }
        Integer dup = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username = ? AND owner_id = ?", Integer.class, req.username(), ownerId);
        if (dup != null && dup > 0) {
            throw new IllegalArgumentException("Username sudah dipakai di organisasi ini.");
        }
        if (!PW_RULE.matcher(req.password()).matches()) {
            throw new IllegalArgumentException("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
        }
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO users (id, username, full_name, password_hash, role, status, owner_id) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)",
                id, req.username(), req.fullName(), encoder.encode(req.password()), req.role(), ownerId);
        List<UserListItemResponse> rows = jdbc.query(
                "SELECT id, username, full_name, role, status, created_at FROM users WHERE id = ?", mapper, id);
        return rows.get(0);
    }

    public boolean resetPassword(UUID id, String newPassword) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return false;
        if (!PW_RULE.matcher(newPassword).matches()) {
            throw new IllegalArgumentException("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
        }
        int updated = jdbc.update("UPDATE users SET password_hash = ? WHERE id = ? AND owner_id = ?", encoder.encode(newPassword), id, ownerId);
        return updated > 0;
    }

    public boolean deactivate(UUID id, String actorUsername) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return false;
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT username, role FROM users WHERE id = ? AND owner_id = ?", id, ownerId);
        if (rows.isEmpty()) return false;
        String username = (String) rows.get(0).get("username");
        String role = (String) rows.get(0).get("role");
        if (username.equals(actorUsername)) {
            throw new IllegalArgumentException("Tidak bisa menonaktifkan akun sendiri.");
        }
        if ("SUPERADMIN".equals(role)) {
            Integer active = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE role = 'SUPERADMIN' AND status = 'ACTIVE' AND owner_id = ?", Integer.class, ownerId);
            if (active != null && active <= 1) {
                throw new IllegalArgumentException("Superadmin aktif tidak boleh habis.");
            }
        }
        return jdbc.update("UPDATE users SET status = 'INACTIVE' WHERE id = ? AND owner_id = ?", id, ownerId) > 0;
    }

    public UserListItemResponse update(UUID id, UserUpdateRequest req, String actorUsername) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) throw new IllegalStateException("Owner context tidak tersedia.");
        if (!CREATABLE_ROLES.contains(req.role())) {
            throw new IllegalArgumentException("Edit tidak boleh mengubah ke SUPERADMIN. Gunakan deactivate + create baru untuk promosi.");
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT username, role, status FROM users WHERE id = ? AND owner_id = ?", id, ownerId);
        if (rows.isEmpty()) throw new IllegalArgumentException("User tidak ditemukan atau bukan milik Anda.");
        Map<String, Object> u = rows.get(0);
        String username = (String) u.get("username");
        String oldRole = (String) u.get("role");

        if (username.equals(actorUsername)) {
            throw new IllegalArgumentException("Tidak bisa mengedit akun sendiri.");
        }

        if ("SUPERADMIN".equals(oldRole) && !"SUPERADMIN".equals(req.role())) {
            Integer active = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE role = 'SUPERADMIN' AND status = 'ACTIVE' AND owner_id = ?",
                    Integer.class, ownerId);
            if (active != null && active <= 1) {
                throw new IllegalArgumentException("SUPERADMIN aktif terakhir tidak boleh diturunkan. Buat SUPERADMIN baru dulu.");
            }
        }

        jdbc.update("UPDATE users SET full_name = ?, role = ? WHERE id = ? AND owner_id = ?",
                req.fullName(), req.role(), id, ownerId);
        List<UserListItemResponse> updated = jdbc.query(
                "SELECT id, username, full_name, role, status, created_at FROM users WHERE id = ?",
                mapper, id);
        return updated.get(0);
    }
}
