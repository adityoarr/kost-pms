package com.adityoarr.kostpms.config;

import com.adityoarr.kostpms.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AuditInterceptor implements HandlerInterceptor {

    private final AuditService auditService;

    public AuditInterceptor(AuditService auditService) {
        this.auditService = auditService;
    }

    // Peta SENSIITF saja. entity_id = capture group(1) bila ada; null utk CREATE.
    private record Rule(String method, Pattern pattern, String action, String entityType) {}

    private static final List<Rule> RULES = List.of(
            new Rule("POST",   Pattern.compile("^/invoices/([^/]+)/payments$"),          "RECORD_PAYMENT",        "INVOICE"),
            new Rule("POST",   Pattern.compile("^/invoices/([^/]+)/adjustments$"),       "RECORD_ADJUSTMENT",     "INVOICE"),
            new Rule("POST",   Pattern.compile("^/invoices/([^/]+)/void$"),              "VOID_INVOICE",          "INVOICE"),
            new Rule("DELETE", Pattern.compile("^/payments/([^/]+)$"),                   "DELETE_PAYMENT",        "PAYMENT"),
            new Rule("DELETE", Pattern.compile("^/tenants/([^/]+)$"),                    "ARCHIVE_TENANT",        "TENANT"),
            new Rule("POST",   Pattern.compile("^/tenants/([^/]+)/reset-password$"),     "RESET_TENANT_PASSWORD", "TENANT"),
            new Rule("POST",   Pattern.compile("^/users$"),                              "CREATE_USER",           "USER"),
            new Rule("POST",   Pattern.compile("^/users/([^/]+)/reset-password$"),       "RESET_USER_PASSWORD",   "USER"),
            new Rule("DELETE", Pattern.compile("^/users/([^/]+)$"),                      "DEACTIVATE_USER",       "USER"),
            new Rule("POST",   Pattern.compile("^/leases$"),                             "CREATE_LEASE",          "LEASE"),
            new Rule("PUT",    Pattern.compile("^/leases/([^/]+)/status$"),              "CHANGE_LEASE_STATUS",   "LEASE")
    );

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        String uri = request.getRequestURI();
        String ctx = request.getContextPath();
        if (ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)) {
            uri = uri.substring(ctx.length());
        }
        String method = request.getMethod();

        for (Rule r : RULES) {
            if (!r.method().equals(method)) continue;
            Matcher m = r.pattern().matcher(uri);
            if (!m.matches()) continue;
            String entityId = m.groupCount() >= 1 ? m.group(1) : null;
            auditService.record(r.action(), r.entityType(), entityId,
                    method, response.getStatus(), clientIp(request));
            return; // satu rule cukup
        }
        // Tidak cocok peta sensitif -> tidak dicatat (read & mutation non-sensitif dilewati).
    }

    // Di belakang nginx/tunnel, remoteAddr = IP internal; X-Forwarded-For berisi klien asli.
    private String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        return req.getRemoteAddr();
    }
}
