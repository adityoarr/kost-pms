package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.TicketCreateRequest;
import com.adityoarr.kostpms.dto.TicketResponse;
import com.adityoarr.kostpms.dto.TicketUpdateRequest;
import com.adityoarr.kostpms.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/tickets")
public class TicketsController {

    private final TicketService ticketService;

    public TicketsController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    // Dipanggil oleh TENANT (plang role di SecurityConfig).
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody TicketCreateRequest req) {
        try {
            String tenantId = SecurityContextHolder.getContext().getAuthentication().getName();
            TicketResponse t = ticketService.create(UUID.fromString(tenantId), req);
            return ResponseEntity.status(HttpStatus.CREATED).body(t);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public List<TicketResponse> list(@RequestParam(required = false) String status) {
        return ticketService.findAll(status);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> get(@PathVariable UUID id) {
        TicketResponse t = ticketService.findById(id);
        return t == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(t);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody TicketUpdateRequest req) {
        try {
            TicketResponse t = ticketService.update(id, req);
            return t == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(t);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
