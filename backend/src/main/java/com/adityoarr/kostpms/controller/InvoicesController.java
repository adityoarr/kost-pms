package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.InvoiceDetailResponse;
import com.adityoarr.kostpms.dto.InvoiceResponse;
import com.adityoarr.kostpms.dto.PaymentRequest;
import com.adityoarr.kostpms.dto.PaymentResponse;
import com.adityoarr.kostpms.dto.VoidRequest;
import com.adityoarr.kostpms.service.InvoiceScheduler;
import com.adityoarr.kostpms.service.InvoiceService;
import com.adityoarr.kostpms.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.DateTimeException;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/invoices")
public class InvoicesController {

    private final InvoiceService invoiceService;
    private final PaymentService paymentService;
    private final InvoiceScheduler invoiceScheduler;

    public InvoicesController(InvoiceService invoiceService,
                              PaymentService paymentService,
                              InvoiceScheduler invoiceScheduler) {
        this.invoiceService = invoiceService;
        this.paymentService = paymentService;
        this.invoiceScheduler = invoiceScheduler;
    }

    @GetMapping
    public List<InvoiceResponse> list(@RequestParam(required = false) String status,
                                      @RequestParam(required = false) String leaseId) {
        return invoiceService.findAll(status, leaseId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDetailResponse> detail(@PathVariable UUID id) {
        InvoiceDetailResponse d = invoiceService.findDetail(id);
        return d == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(d);
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestParam String period) {
        try {
            YearMonth ym = YearMonth.parse(period);
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(invoiceService.generate(ym, username));
        } catch (DateTimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Format period harus YYYY-MM, contoh: 2026-11."));
        }
    }

    // Generate rentang periode (untuk tes, backfill manual, atau darurat).
    @PostMapping("/backfill")
    public ResponseEntity<?> backfill(@RequestParam String from, @RequestParam String to) {
        try {
            YearMonth f = YearMonth.parse(from);
            YearMonth t = YearMonth.parse(to);
            if (t.isBefore(f)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Parameter 'to' tidak boleh sebelum 'from'."));
            }
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return ResponseEntity.ok(invoiceScheduler.generateRange(f, t, username));
        } catch (DateTimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Format from/to harus YYYY-MM, contoh: 2026-10."));
        }
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<?> pay(@PathVariable UUID id, @Valid @RequestBody PaymentRequest req) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            PaymentResponse p = paymentService.recordPayment(id, req, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(p);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/void")
    public ResponseEntity<?> voidInvoice(@PathVariable UUID id, @Valid @RequestBody VoidRequest req) {
        try {
            InvoiceResponse r = invoiceService.voidInvoice(id, req.reason());
            return r == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(r);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}