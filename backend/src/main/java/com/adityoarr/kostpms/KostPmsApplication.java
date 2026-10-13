package com.adityoarr.kostpms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class KostPmsApplication {
    public static void main(String[] args) {
        SpringApplication.run(KostPmsApplication.class, args);
    }
}