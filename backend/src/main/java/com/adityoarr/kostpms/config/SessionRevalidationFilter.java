package com.adityoarr.kostpms.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FIX A8: sesi (Redis, 7 hari) sebelumnya tidak pernah divalidasi ulang, sehingga user yang
 * dinonaktifkan / dihapus / diubah rolenya, atau tenant yang diarsipkan, tetap punya akses
 * sampai sesi kedaluwarsa. Filter ini mengecek status akun di DB pada setiap request
 * terautentikasi; jika tidak valid, sesi dibatalkan dan request diperlakukan sebagai anonim
 * (endpoint terproteksi akan membalas 401 lewat entry point yang sudah ada).
 */
public class SessionRevalidationFilter extends OncePerRequestFilter {

    private final JdbcTemplate jdbc;

    public SessionRevalidationFilter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            boolean valid;
            try {
                valid = isStillValid(auth);
            } catch (RuntimeException e) {
                // DB bermasalah: jangan mengunci semua orang; biarkan request berjalan.
                valid = true;
            }
            if (!valid) {
                HttpSession session = request.getSession(false);
                if (session != null) session.invalidate();
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }

    private boolean isStillValid(Authentication auth) {
        boolean tenant = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_TENANT".equals(a.getAuthority()));
        if (tenant) {
            UUID tenantId;
            try {
                tenantId = UUID.fromString(auth.getName());
            } catch (IllegalArgumentException e) {
                return false;
            }
            Integer n = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM tenants WHERE id = ? AND status = 'ACTIVE'", Integer.class, tenantId);
            return n != null && n > 0;
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT role, status FROM users WHERE username = ?", auth.getName());
        if (rows.isEmpty()) return false;
        Map<String, Object> u = rows.get(0);
        if (!"ACTIVE".equals(String.valueOf(u.get("status")))) return false;
        String expected = "ROLE_" + u.get("role");
        return auth.getAuthorities().stream().anyMatch(a -> expected.equals(a.getAuthority()));
    }
}