package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.UserListItemResponse;
import com.adityoarr.kostpms.service.OwnerOnboardingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/owners")
public class OwnerOnboardingController {

    private final OwnerOnboardingService onboardingService;

    public OwnerOnboardingController(OwnerOnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    public record OnboardRequest(
            @NotBlank String username,
            @NotBlank String fullName,
            @NotBlank String password
    ) {}

    // Onboarding = aksi platform. Hanya SUPERADMIN yang sudah login boleh.
    private boolean isPlatformSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .anyMatch(s -> s.equals("SUPERADMIN") || s.equals("ROLE_SUPERADMIN"));
    }

    @PostMapping
    public ResponseEntity<?> onboard(@Valid @RequestBody OnboardRequest req) {
        if (!isPlatformSuperAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Onboarding owner hanya boleh oleh SUPERADMIN yang login."));
        }
        try {
            UserListItemResponse created = onboardingService.onboardOwner(
                    req.username(), req.fullName(), req.password());
            return ResponseEntity.status(201).body(Map.of(
                    "status", "owner_created",
                    "user", created,
                    "message", "Owner baru berhasil dibuat. Mereka bisa login dan mengelola kost mereka sendiri."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> list() {
        if (!isPlatformSuperAdmin()) {
            return ResponseEntity.status(403).body(Map.of("error", "Hanya SUPERADMIN yang login."));
        }
        return ResponseEntity.ok(onboardingService.listOwners());
    }
}
