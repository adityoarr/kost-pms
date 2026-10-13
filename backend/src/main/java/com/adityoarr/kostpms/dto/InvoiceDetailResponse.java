package com.adityoarr.kostpms.dto;

import java.util.List;

public record InvoiceDetailResponse(
        InvoiceResponse invoice,
        List<PaymentResponse> payments
) {}