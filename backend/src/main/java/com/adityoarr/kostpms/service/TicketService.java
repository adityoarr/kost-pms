package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.TicketCreateRequest;
import com.adityoarr.kostpms.dto.TicketResponse;
import com.adityoarr.kostpms.dto.TicketUpdateRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class TicketService {

    private static final Set<String> STATUSES = Set.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED");
    private static final Set<String> DONE = Set.of("RESOLVED", "CLOSED");

    private final JdbcTemplate jdbc;

    public TicketService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final String SELECT_JOIN =
            "SELECT t.id, t.tenant_id, tn.name AS tenant_name, tn.phone AS tenant_phone, " +
            "       t.unit_id, u.unit_number, p.name AS property_name, t.category, t.title, t.description, " +
            "       t.status, t.assigned_to_username, t.resolved_at, t.resolution_note, t.created_at, t.updated_at " +
            "FROM tickets t " +
            "JOIN tenants tn ON t.tenant_id = tn.id " +
            "JOIN units u ON t.unit_id = u.id " +
            "JOIN properties p ON u.property_id = p.id ";

    private final RowMapper<TicketResponse> mapper = (rs, n) -> new TicketResponse(
            rs.getString("id"),
            rs.getString("tenant_id"),
            rs.getString("tenant_name"),
            rs.getString("tenant_phone"),
            rs.getString("unit_id"),
            rs.getString("unit_number"),
            rs.getString("property_name"),
            rs.getString("category"),
            rs.getString("title"),
            rs.getString("description"),
            rs.getString("status"),
            rs.getString("assigned_to_username"),
            rs.getObject("resolved_at", OffsetDateTime.class),
            rs.getString("resolution_note"),
            rs.getObject("created_at", OffsetDateTime.class),
            rs.getObject("updated_at", OffsetDateTime.class)
    );

    public TicketResponse create(UUID tenantId, TicketCreateRequest req) {
        UUID unitId;
        if (req.unitId() != null && !req.unitId().isBlank()) {
            unitId = UUID.fromString(req.unitId());
            Integer mine = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM leases WHERE tenant_id = ? AND unit_id = ? AND status = 'ACTIVE'",
                    Integer.class, tenantId, unitId);
            if (mine == null || mine == 0) {
                throw new IllegalArgumentException("Kamar tersebut bukan bagian dari kontrak aktif Anda.");
            }
        } else {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT unit_id FROM leases WHERE tenant_id = ? AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1",
                    tenantId);
            if (rows.isEmpty()) {
                throw new IllegalArgumentException("Anda tidak memiliki kontrak hunian aktif.");
            }
            unitId = (UUID) rows.get(0).get("unit_id");
        }
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO tickets (id, tenant_id, unit_id, category, title, description, status) VALUES (?, ?, ?, ?, ?, ?, 'OPEN')",
                id, tenantId, unitId, req.category(), req.title(), req.description());
        return findById(id);
    }

    public List<TicketResponse> findAll(String status) {
        if (status != null && !status.isBlank()) {
            return jdbc.query(SELECT_JOIN + "WHERE t.status = ? ORDER BY t.created_at DESC", mapper, status);
        }
        return jdbc.query(SELECT_JOIN + "ORDER BY t.created_at DESC", mapper);
    }

    public List<TicketResponse> findByTenant(UUID tenantId) {
        return jdbc.query(SELECT_JOIN + "WHERE t.tenant_id = ? ORDER BY t.created_at DESC", mapper, tenantId);
    }

    public TicketResponse findById(UUID id) {
        List<TicketResponse> rows = jdbc.query(SELECT_JOIN + "WHERE t.id = ?", mapper, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public TicketResponse update(UUID id, TicketUpdateRequest req) {
        TicketResponse current = findById(id);
        if (current == null) return null;

        if (req.status() != null && !req.status().isBlank() && !STATUSES.contains(req.status())) {
            throw new IllegalArgumentException("Status tidak dikenal.");
        }
        if (req.assignedToUsername() != null && !req.assignedToUsername().isBlank()) {
            Integer exists = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE username = ? AND status = 'ACTIVE'",
                    Integer.class, req.assignedToUsername());
            if (exists == null || exists == 0) {
                throw new IllegalArgumentException("Pengguna penugasan tidak ditemukan atau tidak aktif.");
            }
        }

        List<String> sets = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        if (req.status() != null && !req.status().isBlank()) {
            sets.add("status = ?");
            params.add(req.status());
            if (DONE.contains(req.status())) {
                sets.add("resolved_at = COALESCE(resolved_at, now())");
            }
        }
        if (req.assignedToUsername() != null && !req.assignedToUsername().isBlank()) {
            sets.add("assigned_to_username = ?");
            params.add(req.assignedToUsername());
        }
        if (req.resolutionNote() != null) {
            sets.add("resolution_note = ?");
            params.add(req.resolutionNote());
        }
        if (sets.isEmpty()) return current;

        sets.add("updated_at = now()");
        params.add(id);
        jdbc.update("UPDATE tickets SET " + String.join(", ", sets) + " WHERE id = ?", params.toArray());
        return findById(id);
    }
}
