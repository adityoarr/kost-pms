package com.adityoarr.kostpms.dto;

public record PaymentInfoResponse(
        String propertyName,
        String bank,
        String accountNumber,
        String accountHolder,
        String notes
) {}
