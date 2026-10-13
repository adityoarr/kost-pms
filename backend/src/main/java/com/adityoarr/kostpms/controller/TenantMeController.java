package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.InvoiceDetailResponse;
import com.adityoarr.kostpms.dto.InvoiceResponse;
import com.adityoarr.kostpms.dto.LeaseResponse;
import com.adityoarr.kostpms.service.InvoiceService;
import com.adityoarr.kostpms.service.LeaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tenant-me")
public class TenantMeController {

    private final LeaseService leaseService;
    private final InvoiceService invoiceService;

    public TenantMeController(LeaseService leaseService, InvoiceService invoiceService) {
        this.leaseService = leaseService;
        this.invoiceService = invoiceService;
    }

    private String currentTenantId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? null : auth.getName();
    }

    private List<LeaseResponse> myLeases() {
        String tid = currentTenantId();
        return leaseService.findAll().stream()
                .filter(l -> l.tenantId().equals(tid))
                .toList();
    }

    @GetMapping("/leases")
    public List<LeaseResponse> leases() {
        return myLeases();
    }

    @GetMapping("/invoices")
    public List<InvoiceResponse> invoices() {
        Set<String> leaseIds = myLeases().stream().map(LeaseResponse::id).collect(Collectors.toSet());
        return invoiceService.findAll(null, null).stream()
                .filter(i -> leaseIds.contains(i.leaseId()))
                .toList();
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<InvoiceDetailResponse> invoiceDetail(@PathVariable UUID id) {
        Set<String> leaseIds = myLeases().stream().map(LeaseResponse::id).collect(Collectors.toSet());
        InvoiceDetailResponse d = invoiceService.findDetail(id);
        if (d == null || !leaseIds.contains(d.invoice().leaseId())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(d);
    }
}