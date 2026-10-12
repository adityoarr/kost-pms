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

    public PropertyService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
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
        return jdbcTemplate.query(
                "SELECT id, name, address, city, province, phone, status, created_by_username " +
                "FROM properties ORDER BY created_at DESC",
                mapper
        );
    }

    public PropertyResponse findById(UUID id) {
        List<PropertyResponse> rows = jdbcTemplate.query(
                "SELECT id, name, address, city, province, phone, status, created_by_username " +
                "FROM properties WHERE id = ?",
                mapper, id
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    public PropertyResponse create(PropertyRequest req, String username) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO properties (id, name, address, city, province, phone, status, created_by_username) " +
                "VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)",
                id, req.name(), req.address(), req.city(), req.province(), req.phone(), username
        );
        return findById(id);
    }

    public PropertyResponse update(UUID id, PropertyRequest req) {
        int updated = jdbcTemplate.update(
                "UPDATE properties SET name=?, address=?, city=?, province=?, phone=?, updated_at=now() " +
                "WHERE id=?",
                req.name(), req.address(), req.city(), req.province(), req.phone(), id
        );
        return updated == 0 ? null : findById(id);
    }

    public boolean deactivate(UUID id) {
        int updated = jdbcTemplate.update(
                "UPDATE properties SET status='INACTIVE', updated_at=now() WHERE id=? AND status='ACTIVE'",
                id
        );
        return updated > 0;
    }
}