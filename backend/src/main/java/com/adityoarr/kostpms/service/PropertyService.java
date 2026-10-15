package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.PropertyRequest;
import com.adityoarr.kostpms.dto.PropertyResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PropertyService {

    private final JdbcTemplate jdbcTemplate;
    private final OwnerContextService ownerContext;

    public PropertyService(JdbcTemplate jdbcTemplate, OwnerContextService ownerContext) {
        this.jdbcTemplate = jdbcTemplate;
        this.ownerContext = ownerContext;
    }

    private final RowMapper<PropertyResponse> mapper = (rs, rowNum) -> new PropertyResponse(
            rs.getString("id"),
            rs.getString("name"),
            rs.getString("address"),
            rs.getString("city"),
            rs.getString("province"),
            rs.getString("phone"),
            rs.getString("status"),
            rs.getString("created_by_username")
    );

    public List<PropertyResponse> findAll() {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return List.of();
        return jdbcTemplate.query(
                "SELECT id, name, address, city, province, phone, status, created_by_username " +
                "FROM properties WHERE owner_id = ? ORDER BY created_at DESC",
                mapper, ownerId
        );
    }

    public PropertyResponse findById(UUID id) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return null;
        List<PropertyResponse> rows = jdbcTemplate.query(
                "SELECT id, name, address, city, province, phone, status, created_by_username " +
                "FROM properties WHERE id = ? AND owner_id = ?",
                mapper, id, ownerId
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    public PropertyResponse create(PropertyRequest req, String username) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) throw new IllegalStateException("Owner context tidak tersedia.");
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO properties (id, name, address, city, province, phone, status, created_by_username, owner_id) " +
                "VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)",
                id, req.name(), req.address(), req.city(), req.province(), req.phone(), username, ownerId
        );
        return findById(id);
    }

    public PropertyResponse update(UUID id, PropertyRequest req) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return null;
        int updated = jdbcTemplate.update(
                "UPDATE properties SET name=?, address=?, city=?, province=?, phone=?, updated_at=now() " +
                "WHERE id=? AND owner_id=?",
                req.name(), req.address(), req.city(), req.province(), req.phone(), id, ownerId
        );
        return updated == 0 ? null : findById(id);
    }

    public boolean deactivate(UUID id) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return false;
        int updated = jdbcTemplate.update(
                "UPDATE properties SET status='INACTIVE', updated_at=now() WHERE id=? AND owner_id=? AND status='ACTIVE'",
                id, ownerId
        );
        return updated > 0;
    }
}
