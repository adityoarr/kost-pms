package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.service.TenantPasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/tenant-auth")
public class TenantPasswordResetController {

    private final TenantPasswordResetService resetService;

    public TenantPasswordResetController(TenantPasswordResetService resetService) {
        this.resetService = resetService;
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgot(@RequestBody Map<String, String> body) {
        try {
            resetService.requestReset(body.get("phone"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(429).body(Map.of("error", e.getMessage()));
        }
        // Generik: sama apakah terdaftar atau tidak (anti-enumeration).
        return ResponseEntity.ok(Map.of("status", "ok",
                "message", "Jika nomor terdaftar dan memiliki email, tautan reset telah dikirim."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> reset(@RequestBody Map<String, String> body) {
        try {
            resetService.confirmReset(body.get("token"), body.get("password"));
            return ResponseEntity.ok(Map.of("status", "password_reset"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
