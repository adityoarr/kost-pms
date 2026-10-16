package com.adityoarr.kostpms.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * FIX A10/A12: sebelumnya exception yang tidak ditangkap controller menjadi HTTP 500.
 * Handler ini memetakannya ke status yang benar dengan body {"error": "..."} (format yang sama
 * dengan controller lain). Controller yang sudah menangkap exception-nya sendiri tidak terpengaruh.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Validasi manual di service / UUID.fromString / parsing -> input tidak valid.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage() == null ? "Permintaan tidak valid." : e.getMessage()));
    }

    // Aturan bisnis dilanggar (mis. owner context tidak ada, transisi status tidak boleh).
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> conflict(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", e.getMessage() == null ? "Permintaan tidak dapat diproses." : e.getMessage()));
    }

    // Unique constraint (mis. nomor HP / username / nomor kamar sudah ada).
    // Pesan sengaja generik: tidak membocorkan apakah data itu milik organisasi lain.
    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Map<String, String>> duplicate(DuplicateKeyException e) {
        log.warn("Duplicate key: {}", e.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "Data dengan nilai yang sama sudah ada."));
    }

    // FK (data masih dipakai), NOT NULL, atau panjang kolom terlampaui.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> integrity(DataIntegrityViolationException e) {
        log.warn("Data integrity violation: {}", e.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error",
                        "Data tidak dapat diproses: masih dipakai data lain, nilainya terlalu panjang, atau ada field wajib yang kosong."));
    }
}