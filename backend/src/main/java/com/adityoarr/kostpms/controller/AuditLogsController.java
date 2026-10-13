package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.AuditLogResponse;
import com.adityoarr.kostpms.service.AuditService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/audit")
public class AuditLogsController {

    private final AuditService auditService;

    public AuditLogsController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public List<AuditLogResponse> list(@RequestParam(required = false) Integer limit,
                                       @RequestParam(required = false) String action,
                                       @RequestParam(required = false) String actor) {
        return auditService.query(limit, action, actor);
    }
}
