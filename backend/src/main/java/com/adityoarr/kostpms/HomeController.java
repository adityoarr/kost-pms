package com.adityoarr.kostpms;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, String> home() {
        return Map.of(
                "app", "kost-pms-api",
                "version", "0.1.0",
                "status", "berjalan"
        );
    }
}