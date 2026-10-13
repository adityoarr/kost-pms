package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.TenantAuthResponse;
import com.adityoarr.kostpms.dto.TenantLoginRequest;
import com.adityoarr.kostpms.dto.TenantSetupPasswordRequest;
import com.adityoarr.kostpms.service.TenantAuthService;
import com.adityoarr.kostpms.service.TenantAuthService.LoginOutcome;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/tenant-auth")
public class TenantAuthController {

    private final TenantAuthService tenantAuthService;

    public TenantAuthController(TenantAuthService tenantAuthService) {
        this.tenantAuthService = tenantAuthService;
    }

    // Tenant pertama kali: buat password. Sukses -> langsung session.
    @PostMapping("/setup-password")
    public ResponseEntity<?> setupPassword(@Valid @RequestBody TenantSetupPasswordRequest req,
                                           HttpServletRequest sr,
                                           HttpServletResponse ss) {
        try {
            TenantAuthResponse r = tenantAuthService.setupPassword(
                    req.phone(), req.password(), req.confirmPassword());
            saveSession(buildAuth(r.tenantId()), sr, ss);
            return ResponseEntity.ok(r);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Tenant login: no HP + password.
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody TenantLoginRequest req,
                                   HttpServletRequest sr,
                                   HttpServletResponse ss) {
        LoginOutcome out = tenantAuthService.login(req.phone(), req.password());
        switch (out.status()) {
            case SUCCESS: {
                saveSession(buildAuth(out.response().tenantId()), sr, ss);
                return ResponseEntity.ok(out.response());
            }
            case NEEDS_SETUP:
                return ResponseEntity.status(428).body(
                        Map.<String, Object>of("needsSetup", true,
                                "message", "Akun Anda belum memiliki password. Silakan buat password terlebih dahulu."));
            case BAD_PASSWORD:
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Password salah. Periksa kembali."));
            case NOT_REGISTERED:
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Nomor ini belum terdaftar sebagai penyewa aktif. Hubungi pengelola kost."));
            case RATE_LIMITED:
                return ResponseEntity.status(429)
                        .body(Map.of("error", "Terlalu banyak percobaan login. Tunggu 15 menit lalu coba lagi."));
            default:
                return ResponseEntity.internalServerError().build();
        }
    }

    // Siapa saya? Hanya untuk sesi tenant.
    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Belum login."));
        }
        boolean isTenant = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_TENANT".equals(a.getAuthority()));
        if (!isTenant) {
            // Menutup celah: owner/admin tidak bisa memakai endpoint tenant.
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Endpoint ini khusus penyewa."));
        }
        TenantAuthResponse r = tenantAuthService.findActiveTenantById(UUID.fromString(auth.getName()));
        if (r == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Sesi tidak valid atau akun sudah tidak aktif. Silakan login ulang."));
        }
        return ResponseEntity.ok(r);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest sr) {
        HttpSession session = sr.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("status", "logged_out"));
    }

    // ---- helpers (pola identik dengan auth owner) ----
    private Authentication buildAuth(String tenantId) {
        return new UsernamePasswordAuthenticationToken(
                tenantId, null, List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
    }

    private void saveSession(Authentication auth, HttpServletRequest sr, HttpServletResponse ss) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        new HttpSessionSecurityContextRepository().saveContext(context, sr, ss);
    }
}