package com.adityoarr.kostpms.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * FIX A6: CSRF dimatikan dan cookie sesi SameSite=None, sehingga form lintas-situs bisa
 * memicu POST/PUT/DELETE (terutama endpoint tanpa body JSON). Filter ini menolak request
 * "mengubah data" yang header Origin-nya bukan salah satu origin frontend yang diizinkan.
 *
 * - Browser selalu mengirim Origin pada request lintas-origin non-GET, jadi serangan CSRF terblokir.
 * - Request tanpa Origin (curl, server-to-server, tes) tetap lolos: bukan vektor CSRF browser.
 * - Daftar origin diatur lewat app.allowed-origins (env APP_ALLOWED_ORIGINS, dipisah koma).
 *   Jika kosong, filter nonaktif.
 */
public class CsrfOriginFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final Set<String> allowedOrigins;

    public CsrfOriginFilter(String allowedOriginsCsv) {
        this.allowedOrigins = allowedOriginsCsv == null ? Set.of()
                : Arrays.stream(allowedOriginsCsv.split(","))
                        .map(CsrfOriginFilter::normalize)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toUnmodifiableSet());
    }

    private static String normalize(String s) {
        String v = s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
        while (v.endsWith("/")) v = v.substring(0, v.length() - 1);
        return v;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (allowedOrigins.isEmpty() || SAFE_METHODS.contains(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        String origin = request.getHeader("Origin");
        if (origin == null || allowedOrigins.contains(normalize(origin))) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"error\":\"Origin tidak diizinkan.\"}");
    }
}