package com.adityoarr.kostpms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Value("${SMTP_HOST:}") private String host;
    @Value("${SMTP_PORT:587}") private int port;
    @Value("${SMTP_USERNAME:}") private String username;
    @Value("${SMTP_PASSWORD:}") private String password;
    @Value("${MAIL_FROM:noreply@kost.adityoarr.com}") private String from;

    public boolean enabled() {
        return host != null && !host.isBlank();
    }

    // Jika SMTP belum dikonfigurasi -> tulis ke log (dummy), jangan crash.
    public void send(String to, String subject, String body) {
        if (!enabled()) {
            log.info("[EMAIL][DUMMY] to={} subject={} :: {}", to, subject, body.replace("\n", " | "));
            return;
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        if (username != null && !username.isBlank()) {
            sender.setUsername(username);
            sender.setPassword(password);
        }
        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(to);
        msg.setSubject(subject);
        msg.setText(body);
        sender.send(msg);
    }
}
