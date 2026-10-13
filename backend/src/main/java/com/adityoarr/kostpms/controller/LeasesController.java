package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.LeaseRequest;
import com.adityoarr.kostpms.dto.LeaseResponse;
import com.adityoarr.kostpms.service.LeaseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/leases")
public class LeasesController {

    private final LeaseService leaseService;

    public LeasesController(LeaseService leaseService) {
        this.leaseService = leaseService;
    }

    @GetMapping
    public List<LeaseResponse> list() {
        return leaseService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaseResponse> get(@PathVariable UUID id) {
        LeaseResponse l = leaseService.findById(id);
        return l == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(l);
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody LeaseRequest req) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.status(HttpStatus.CREATED).body(leaseService.create(req, username));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Tutup kontrak: body { "status": "ENDED" } atau { "status": "CANCELLED" }
    @PutMapping("/{id}/status")
    public ResponseEntity<?> changeStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        try {
            String newStatus = body.get("status");
            LeaseResponse l = leaseService.changeStatus(id, newStatus);
            return ResponseEntity.ok(l);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}