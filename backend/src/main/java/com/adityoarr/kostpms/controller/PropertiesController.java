package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.PropertyRequest;
import com.adityoarr.kostpms.dto.PropertyResponse;
import com.adityoarr.kostpms.service.PropertyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/properties")
public class PropertiesController {

    private final PropertyService propertyService;

    public PropertiesController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    @GetMapping
    public List<PropertyResponse> list() {
        return propertyService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PropertyResponse> get(@PathVariable UUID id) {
        PropertyResponse p = propertyService.findById(id);
        return p == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(p);
    }

    @PostMapping
    public ResponseEntity<PropertyResponse> create(@Valid @RequestBody PropertyRequest req) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        PropertyResponse created = propertyService.create(req, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PropertyResponse> update(@PathVariable UUID id, @Valid @RequestBody PropertyRequest req) {
        PropertyResponse updated = propertyService.update(id, req);
        return updated == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deactivate(@PathVariable UUID id) {
        boolean ok = propertyService.deactivate(id);
        return ok ? ResponseEntity.ok(Map.of("status", "deactivated"))
                  : ResponseEntity.notFound().build();
    }
}