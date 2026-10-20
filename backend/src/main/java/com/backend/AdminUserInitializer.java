package com.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserInitializer implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminUserInitializer.class);

    private final UserAccountRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;

    public AdminUserInitializer(UserAccountRepository repository,
                                PasswordEncoder passwordEncoder,
                                @Value("${personal-hub.admin.username}") String username,
                                @Value("${personal-hub.admin.password}") String password) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (repository.count() > 0) return;
        if (password == null || password.length() < 8) {
            log.warn("No administrator created. Set PERSONAL_HUB_ADMIN_PASSWORD (at least 8 characters) and restart.");
            return;
        }
        UserAccount account = new UserAccount();
        account.setUsername(username == null || username.isBlank() ? "admin" : username.trim());
        account.setPasswordHash(passwordEncoder.encode(password));
        repository.save(account);
        log.info("Personal Hub administrator '{}' created.", account.getUsername());
    }
}
