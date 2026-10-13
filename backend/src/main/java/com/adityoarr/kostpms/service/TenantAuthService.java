package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.TenantAuthResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class TenantAuthService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redis;

    // Password: minimal 8 karakter, wajib ada huruf DAN angka.
    private static final Pattern PW_RULE = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);

    public TenantAuthService(JdbcTemplate jdbcTemplate,
                             PasswordEncoder passwordEncoder,
                             StringRedisTemplate redis) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.redis = redis;
    }

    private String loginRateKey(String phone) {
        return "kost:tenant:login:rate:" + phone;
    }

    // Hanya tenant ACTIVE yang bisa login/setup. Mengembalikan null jika tidak ada.
    private Map<String, Object> findActiveTenant(String phone) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, name, phone, password_hash FROM tenants WHERE phone = ? AND status = 'ACTIVE'",
                phone);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private TenantAuthResponse toResponse(Map<String, Object> t) {
        return new TenantAuthResponse(
                String.valueOf(t.get("id")),
                (String) t.get("name"),
                (String) t.get("phone"),
                "TENANT");
    }

    // ---- SETUP PASSWORD (hanya saat password_hash masih NULL) ----
    public TenantAuthResponse setupPassword(String phone, String password, String confirmPassword) {
        Map<String, Object> t = findActiveTenant(phone);
        if (t == null) {
            throw new IllegalArgumentException("Nomor ini belum terdaftar sebagai penyewa aktif. Hubungi pengelola kost.");
        }
        if (t.get("password_hash") != null) {
            throw new IllegalArgumentException("Password sudah pernah dibuat untuk nomor ini. Silakan login.");
        }
        if (!password.equals(confirmPassword)) {
            throw new IllegalArgumentException("Konfirmasi password tidak cocok dengan password yang dimasukkan.");
        }
        if (!PW_RULE.matcher(password).matches()) {
            throw new IllegalArgumentException("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
        }
        String hash = passwordEncoder.encode(password);
        jdbcTemplate.update(
                "UPDATE tenants SET password_hash = ?, updated_at = now() WHERE id = ?",
                hash, t.get("id"));
        return toResponse(t);
    }

    // ---- LOGIN (tidak melempar exception untuk alur normal; semua hasil via LoginOutcome) ----
    public LoginOutcome login(String phone, String password) {
        Map<String, Object> t = findActiveTenant(phone);
        if (t == null) {
            return LoginOutcome.notRegistered();
        }
        Object hash = t.get("password_hash");
        if (hash == null) {
            // Belum punya password -> suruh frontend tampilkan form buat-password.
            // TIDAK dihitung sebagai percobaan login (belum ada password untuk ditebak).
            return LoginOutcome.needsSetup();
        }

        // Rate limit: hanya menghitung tebakan password sungguhan.
        String key = loginRateKey(phone);
        Long hits = redis.opsForValue().increment(key);
        if (hits != null && hits == 1L) {
            redis.expire(key, LOGIN_WINDOW);
        }
        if (hits != null && hits > MAX_LOGIN_ATTEMPTS) {
            return LoginOutcome.rateLimited();
        }

        if (!passwordEncoder.matches(password, (String) hash)) {
            return LoginOutcome.badPassword();
        }

        // Sukses -> bersihkan pencacah agar tidak menahan login berikutnya.
        redis.delete(key);
        return LoginOutcome.success(toResponse(t));
    }

    // ---- Lookup untuk /me (wajib ACTIVE; jika diarsipkan saat sesi hidup, akses dicabut) ----
    public TenantAuthResponse findActiveTenantById(UUID id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, name, phone FROM tenants WHERE id = ? AND status = 'ACTIVE'", id);
        if (rows.isEmpty()) return null;
        Map<String, Object> t = rows.get(0);
        return new TenantAuthResponse(String.valueOf(t.get("id")),
                (String) t.get("name"), (String) t.get("phone"), "TENANT");
    }

    // ==== Hasil login sebagai enum + record nested (tanpa exception class tambahan) ====
    public enum LoginStatus { SUCCESS, NEEDS_SETUP, BAD_PASSWORD, NOT_REGISTERED, RATE_LIMITED }

    public record LoginOutcome(LoginStatus status, TenantAuthResponse response) {
        static LoginOutcome success(TenantAuthResponse r) { return new LoginOutcome(LoginStatus.SUCCESS, r); }
        static LoginOutcome needsSetup()   { return new LoginOutcome(LoginStatus.NEEDS_SETUP, null); }
        static LoginOutcome badPassword()  { return new LoginOutcome(LoginStatus.BAD_PASSWORD, null); }
        static LoginOutcome notRegistered(){ return new LoginOutcome(LoginStatus.NOT_REGISTERED, null); }
        static LoginOutcome rateLimited()  { return new LoginOutcome(LoginStatus.RATE_LIMITED, null); }
    }
}