package com.adityoarr.kostpms.config;

import com.adityoarr.kostpms.service.AuditService;
import com.adityoarr.kostpms.service.AuditSnapshotService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AuditInterceptor implements HandlerInterceptor {

    private static final String ATTR_RULE = "auditRule";
    private static final String ATTR_BEFORE = "auditBefore";
    private static final String ATTR_ENTITY = "auditEntity";

    private final AuditService auditService;
    private final AuditSnapshotService snapshotService;

    public AuditInterceptor(AuditService auditService, AuditSnapshotService snapshotService) {
        this.auditService = auditService;
        this.snapshotService = snapshotService;
    }

    private record Rule(String method, Pattern pattern, String action, String entityType, boolean needsDiff) {}

    private static final List<Rule> RULES = List.of(
            new Rule("POST",   Pattern.compile("^/invoices/([^/]+)/payments$"),      "RECORD_PAYMENT",        "INVOICE", true),
            new Rule("POST",   Pattern.compile("^/invoices/([^/]+)/adjustments$"),   "RECORD_ADJUSTMENT",     "INVOICE", true),
            new Rule("POST",   Pattern.compile("^/invoices/([^/]+)/void$"),          "VOID_INVOICE",          "INVOICE", true),
            new Rule("DELETE", Pattern.compile("^/payments/([^/]+)$"),               "DELETE_PAYMENT",        "PAYMENT", true),
            new Rule("DELETE", Pattern.compile("^/tenants/([^/]+)$"),                "ARCHIVE_TENANT",        "TENANT",  true),
            new Rule("POST",   Pattern.compile("^/tenants/([^/]+)/reset-password$"), "RESET_TENANT_PASSWORD", "TENANT",  false),
            new Rule("POST",   Pattern.compile("^/users$"),                          "CREATE_USER",           "USER",    false),
            new Rule("PUT",    Pattern.compile("^/users/([^/]+)$"),                  "UPDATE_USER",           "USER",    true),
            new Rule("POST",   Pattern.compile("^/users/([^/]+)/reset-password$"),   "RESET_USER_PASSWORD",   "USER",    false),
            new Rule("DELETE", Pattern.compile("^/users/([^/]+)$"),                  "DEACTIVATE_USER",       "USER",    true),
            new Rule("POST",   Pattern.compile("^/leases$"),                         "CREATE_LEASE",          "LEASE",   false),
            new Rule("PUT",    Pattern.compile("^/leases/([^/]+)/status$"),          "CHANGE_LEASE_STATUS",   "LEASE",   true)
    );

    private String stripContext(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String ctx = request.getContextPath();
        if (ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)) uri = uri.substring(ctx.length());
        return uri;
    }

    private Rule match(HttpServletRequest request) {
        String uri = stripContext(request);
        String method = request.getMethod();
        for (Rule r : RULES) {
            if (!r.method().equals(method)) continue;
            if (r.pattern().matcher(uri).matches()) return r;
        }
        return null;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Rule r = match(request);
        if (r == null) return true;
        Matcher m = r.pattern().matcher(stripContext(request));
        String entityId = m.matches() && m.groupCount() >= 1 ? m.group(1) : null;
        request.setAttribute(ATTR_RULE, r);
        request.setAttribute(ATTR_ENTITY, entityId);
        if (r.needsDiff() && entityId != null) {
            request.setAttribute(ATTR_BEFORE, snapshotService.snapshot(r.entityType(), entityId));
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        Rule r = (Rule) request.getAttribute(ATTR_RULE);
        if (r == null) return;
        String entityId = (String) request.getAttribute(ATTR_ENTITY);
        String before = (String) request.getAttribute(ATTR_BEFORE);
        String after = (r.needsDiff() && entityId != null) ? snapshotService.snapshot(r.entityType(), entityId) : null;
        auditService.record(r.action(), r.entityType(), entityId,
                request.getMethod(), response.getStatus(), clientIp(request),
                before, after);
    }

    private String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        return req.getRemoteAddr();
    }
}
