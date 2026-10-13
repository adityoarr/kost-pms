package com.adityoarr.kostpms.dto;

// Semua opsional: owner boleh mengosongkan / belum mengatur.
public record PaymentInfoRequest(
        String bank,
        String accountNumber,
        String accountHolder,
        String notes
) {}
