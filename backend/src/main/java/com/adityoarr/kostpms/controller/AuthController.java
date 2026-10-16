package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.LoginRequest;
import com.adityoarr.kostpms.dto.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final int MAX_FAILS = 10;
    private static final Duration FAIL_WINDOW = Duration.ofMinutes(15);

    private final AuthenticationManager authenticationManager;
    private final StringRedisTemplate redis;
    private final String platformAdminUsername;

    public AuthController(AuthenticationManager authenticationManager,
                          StringRedisTemplate redis,
                          @Value("${app.platform-admin-username:owner}") String platformAdminUsername) {
        this.authenticationManager = authenticationManager;
        this.redis = redis;
        this.platformAdminUsername = platformAdminUsername;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   HttpServletRequest servletRequest,
                                   HttpServletResponse servletResponse) {
        // FIX A9: batasi percobaan login gagal per username (15 menit).
        String failKey = "kost:login:fail:" + request.username().trim().toLowerCase();
        String cur = redis.opsForValue().get(failKey);
        if (cur != null && Long.parseLong(cur) >= MAX_FAILS) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Terlalu banyak percobaan login. Tunggu 15 menit lalu coba lagi."));
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
        } catch (AuthenticationException e) {
            Long hits = redis.opsForValue().increment(failKey);
            if (hits != null && hits == 1L) redis.expire(failKey, FAIL_WINDOW);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Username atau password salah"));
        }
        redis.delete(failKey);

        // FIX A8: ganti ID sesi saat login (cegah session fixation).
        if (servletRequest.getSession(false) != null) {
            servletRequest.changeSessionId();
        }

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        new HttpSessionSecurityContextRepository().saveContext(context, servletRequest, servletResponse);

        return ResponseEntity.ok(toResponse(authentication));
    }

    @GetMapping("/me")
    public UserResponse me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return toResponse(authentication);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest servletRequest) {
        HttpSession session = servletRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("status", "logged_out"));
    }

    private UserResponse toResponse(Authentication authentication) {
        List<String> roles = new ArrayList<>(authentication.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .toList());
        // FIX A7: penanda admin platform (bukan authority Spring; hanya info untuk frontend).
        if (roles.contains("ROLE_SUPERADMIN") && platformAdminUsername.equals(authentication.getName())) {
            roles.add("PLATFORM_ADMIN");
        }
        return new UserResponse(authentication.getName(), roles);
    }
}