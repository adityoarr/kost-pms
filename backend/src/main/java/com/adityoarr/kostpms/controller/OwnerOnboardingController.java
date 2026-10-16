package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.UserListItemResponse;
import com.adityoarr.kostpms.service.OwnerOnboardingService;
import com.adityoarr.kostpms.service.PlatformAdminService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/owners")
public class OwnerOnboardingController {

    private final OwnerOnboardingService onboardingService;
    private final PlatformAdminService platformAdmin;

    public OwnerOnboardingController(OwnerOnboardingService onboardingService,
                                     PlatformAdminService platformAdmin) {
        this.onboardingService = onboardingService;
        this.platformAdmin = platformAdmin;
    }

    public record OnboardRequest(
            @NotBlank String username,
            @NotBlank String fullName,
            @NotBlank String password
    ) {}

    // FIX A7: gate = admin PLATFORM (SUPERADMIN dengan username app.platform-admin-username),
    // bukan sembarang SUPERADMIN (setiap owner kost adalah SUPERADMIN organisasinya sendiri).
    private boolean isPlatformSuperAdmin() {
        return platformAdmin.isCurrentPlatformAdmin();
    }

    @PostMapping
    public ResponseEntity<?> onboard(@Valid @RequestBody OnboardRequest req) {
        if (!isPlatformSuperAdmin()) {
            return ResponseEntity.status(403)
                    .body(Map.of("error", "Onboarding owner hanya boleh oleh admin platform."));
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
            return ResponseEntity.status(403).body(Map.of("error", "Hanya admin platform."));
        }
        return ResponseEntity.ok(onboardingService.listOwners());
    }
}