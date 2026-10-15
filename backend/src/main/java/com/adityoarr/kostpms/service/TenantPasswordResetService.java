package com.adityoarr.kostpms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class TenantPasswordResetService {

    private static final Pattern PW_RULE = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");
    private final SecureRandom random = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final EmailService emailService;

    @Value("${app.base-url:https://kost.adityoarr.com}") private String baseUrl;

    public TenantPasswordResetService(JdbcTemplate jdbc, PasswordEncoder encoder, EmailService emailService) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.emailService = emailService;
    }

    // Respons generik di controller: tidak membocorkan apakah nomor terdaftar.
    public boolean requestReset(String phone) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, name, email FROM tenants WHERE phone = ? AND status = 'ACTIVE'", phone);
        if (rows.isEmpty() || rows.get(0).get("email") == null) return false;
        UUID tenantId = UUID.fromString(String.valueOf(rows.get(0).get("id")));
        String name = String.valueOf(rows.get(0).get("name"));
        String email = String.valueOf(rows.get(0).get("email"));

        Integer recent = jdbc.queryForObject(
                "SELECT COUNT(*) FROM tenant_password_resets WHERE tenant_id = ? AND created_at > now() - interval '1 hour'",
                Integer.class, tenantId);
        if (recent != null && recent >= 3) {
            throw new IllegalStateException("Terlalu banyak permintaan reset. Coba lagi nanti.");
        }

        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = toHex(bytes);
        jdbc.update(
                "INSERT INTO tenant_password_resets (id, tenant_id, token_hash, expires_at) VALUES (?, ?, ?, now() + interval '1 hour')",
                UUID.randomUUID(), tenantId, sha256(token));

        String link = baseUrl + "/tenant/reset-password?token=" + token;
        emailService.send(email,
                "Permintaan reset password kost",
                "Halo " + name + ",\n\nKami menerima permintaan reset password akun kost Anda.\n" +
                "Buka tautan berikut untuk membuat password baru (berlaku 1 jam, sekali pakai):\n" + link +
                "\n\nJika Anda tidak merasa meminta reset, abaikan email ini.\n");
        return true;
    }

    public void confirmReset(String token, String newPassword) {
        if (token == null || token.isBlank()) throw new IllegalArgumentException("Token tidak valid.");
        if (!PW_RULE.matcher(newPassword).matches()) {
            throw new IllegalArgumentException("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, tenant_id FROM tenant_password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > now()",
                sha256(token));
        if (rows.isEmpty()) throw new IllegalArgumentException("Tautan reset tidak valid atau sudah kedaluwarsa.");
        UUID resetId = UUID.fromString(String.valueOf(rows.get(0).get("id")));
        UUID tenantId = UUID.fromString(String.valueOf(rows.get(0).get("tenant_id")));
        jdbc.update("UPDATE tenants SET password_hash = ? WHERE id = ?", encoder.encode(newPassword), tenantId);
        jdbc.update("UPDATE tenant_password_resets SET used_at = now() WHERE id = ?", resetId);
    }

    private String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return toHex(md.digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("sha256 gagal", e);
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
