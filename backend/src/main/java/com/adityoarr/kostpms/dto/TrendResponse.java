package com.adityoarr.kostpms.dto;

import java.util.List;

public record TrendResponse(List<MonthPoint> months) {
    public record MonthPoint(String month, long billed, long collected, int occupied) {}
}
