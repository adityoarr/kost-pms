package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.AuditLogResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuditService {

    private final JdbcTemplate jdbc;

    public AuditService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<AuditLogResponse> mapper = (rs, n) -> new AuditLogResponse(
            rs.getString("id"),
            rs.getString("actor_username"),
            rs.getString("actor_role"),
            rs.getString("action"),
            rs.getString("entity_type"),
            rs.getString("entity_id"),
            rs.getString("http_method"),
            rs.getInt("http_status"),
            rs.getString("ip"),
            rs.getString("detail_before"),
            rs.getString("detail_after"),
            rs.getObject("created_at", OffsetDateTime.class)
    );

    public void record(String action, String entityType, String entityId,
                       String httpMethod, int httpStatus, String ip,
                       String detailBefore, String detailAfter) {
        String actor = null;
        String role = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            actor = auth.getName();
            role = auth.getAuthorities().stream()
                    .map(a -> a.getAuthority())
                    .collect(Collectors.joining(","));
        }
        jdbc.update(
                "INSERT INTO audit_logs (id, actor_username, actor_role, action, entity_type, entity_id, http_method, http_status, ip, detail_before, detail_after) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID(), actor, role, action, entityType, entityId, httpMethod, httpStatus,
                ip == null ? null : (ip.length() > 120 ? ip.substring(0, 120) : ip),
                detailBefore, detailAfter);
    }

    public List<AuditLogResponse> query(Integer limit, String action, String actor) {
        StringBuilder sb = new StringBuilder(
                "SELECT id, actor_username, actor_role, action, entity_type, entity_id, http_method, http_status, ip, detail_before, detail_after, created_at FROM audit_logs");
        List<Object> params = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        if (action != null && !action.isBlank()) { conds.add("action = ?"); params.add(action); }
        if (actor != null && !actor.isBlank()) { conds.add("actor_username = ?"); params.add(actor); }
        if (!conds.isEmpty()) sb.append(" WHERE ").append(String.join(" AND ", conds));
        sb.append(" ORDER BY created_at DESC");
        int lim = (limit == null || limit <= 0 || limit > 500) ? 100 : limit;
        sb.append(" LIMIT ?");
        params.add(lim);
        return jdbc.query(sb.toString(), mapper, params.toArray());
    }
}
