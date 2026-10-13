package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.PaymentInfoRequest;
import com.adityoarr.kostpms.dto.PaymentInfoResponse;
import com.adityoarr.kostpms.service.PaymentInfoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
public class PaymentInfoController {

    private final PaymentInfoService service;

    public PaymentInfoController(PaymentInfoService service) {
        this.service = service;
    }

    // --- sisi pemilik (SUPERADMIN/ADMIN via matcher PUT /properties/**) ---
    @GetMapping("/properties/{id}/payment-info")
    public ResponseEntity<?> getForProperty(@PathVariable UUID id) {
        PaymentInfoResponse r = service.getForProperty(id);
        return r == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(r);
    }

    @PutMapping("/properties/{id}/payment-info")
    public ResponseEntity<?> updateForProperty(@PathVariable UUID id, @RequestBody PaymentInfoRequest req) {
        boolean ok = service.updateForProperty(id, req);
        return ok ? ResponseEntity.ok(service.getForProperty(id))
                  : ResponseEntity.notFound().build();
    }

    // --- sisi tenant (TENANT via matcher /tenant-me/**) ---
    @GetMapping("/tenant-me/payment-info")
    public PaymentInfoResponse getForTenant() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return service.getForTenant(UUID.fromString(auth.getName()));
    }
}
