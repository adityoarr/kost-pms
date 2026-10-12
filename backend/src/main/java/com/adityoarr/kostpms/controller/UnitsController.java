package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.UnitRequest;
import com.adityoarr.kostpms.dto.UnitResponse;
import com.adityoarr.kostpms.service.UnitService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/properties/{propertyId}/units")
public class UnitsController {

    private final UnitService unitService;

    public UnitsController(UnitService unitService) {
        this.unitService = unitService;
    }

    @GetMapping
    public List<UnitResponse> list(@PathVariable UUID propertyId) {
        return unitService.findByProperty(propertyId);
    }

    @PostMapping
    public ResponseEntity<?> create(@PathVariable UUID propertyId, @Valid @RequestBody UnitRequest req) {
        try {
            // FORCE propertyId dari URL PATH, abaikan apa pun yang dikirim di body.
            // Ini mencegah user jahat mengirim unit ke properti lain lewat body spoofing.
            UnitRequest safeReq = new UnitRequest(
                propertyId.toString(), 
                req.unitNumber(), 
                req.unitType(), 
                req.capacity(), 
                req.monthlyRate(), 
                req.facilities(), 
                req.status()
            );
            
            UnitResponse created = unitService.create(safeReq);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Terjadi kesalahan server"));
        }
    }
}

// Controller terpisah untuk operasi global /units/{id}
@RestController
@RequestMapping("/units")
class UnitOperationsController {
    private final UnitService unitService;
    public UnitOperationsController(UnitService unitService) { this.unitService = unitService; }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @Valid @RequestBody UnitRequest req) {
        try {
            // Untuk update, propertyId di body juga diabaikan demi konsistensi keamanan
            // kecuali service butuh validasi kepemilikan (nanti di fase tenant).
            UnitResponse updated = unitService.update(id, req);
            return updated == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(updated);
        } catch (Exception e) {
             return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable UUID id) {
        boolean ok = unitService.delete(id);
        return ok ? ResponseEntity.ok(Map.of("status", "deleted")) : ResponseEntity.notFound().build();
    }
    
    // Helper untuk GET single unit by ID (tanpa perlu propertyId di path)
    @GetMapping("/{id}")
    public ResponseEntity<UnitResponse> getById(@PathVariable UUID id) {
         UnitResponse u = unitService.findById(id);
         return u == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(u);
    }
}