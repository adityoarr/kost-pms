package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.TenantRequest;
import com.adityoarr.kostpms.dto.TenantResponse;
import com.adityoarr.kostpms.service.TenantService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/tenants")
public class TenantsController {

    private final TenantService tenantService;

    public TenantsController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @GetMapping
    public List<TenantResponse> list() {
        return tenantService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TenantResponse> get(@PathVariable UUID id) {
        TenantResponse t = tenantService.findById(id);
        return t == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(t);
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody TenantRequest req) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.status(HttpStatus.CREATED).body(tenantService.create(req, username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @Valid @RequestBody TenantRequest req) {
        try {
            TenantResponse t = tenantService.update(id, req);
            return t == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(t);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> archive(@PathVariable UUID id) {
        try {
            boolean ok = tenantService.archive(id);
            return ok ? ResponseEntity.ok(Map.of("status", "archived"))
                      : ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Khusus owner/admin: reset password tenant (jawaban "lupa password" ala MVP).
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@PathVariable UUID id) {
        boolean ok = tenantService.resetPassword(id);
        return ok ? ResponseEntity.ok(Map.of("status", "password_reset"))
                  : ResponseEntity.notFound().build();
    }
}