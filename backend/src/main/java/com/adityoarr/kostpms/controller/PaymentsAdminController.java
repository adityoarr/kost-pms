package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.AdjustmentRequest;
import com.adityoarr.kostpms.dto.PaymentResponse;
import com.adityoarr.kostpms.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("")
public class PaymentsAdminController {

    private final PaymentService paymentService;

    public PaymentsAdminController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // Adjustment (payment negatif) — SUPERADMIN saja via SecurityConfig.
    @PostMapping("/invoices/{id}/adjustments")
    public ResponseEntity<?> adjust(@PathVariable UUID id, @Valid @RequestBody AdjustmentRequest req) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            PaymentResponse p = paymentService.recordAdjustment(id, req, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(p);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Hapus payment — SUPERADMIN saja via SecurityConfig.
    @DeleteMapping("/payments/{id}")
    public ResponseEntity<Map<String, String>> deletePayment(@PathVariable UUID id) {
        boolean ok = paymentService.deletePayment(id);
        return ok ? ResponseEntity.ok(Map.of("status", "deleted"))
                  : ResponseEntity.notFound().build();
    }
}