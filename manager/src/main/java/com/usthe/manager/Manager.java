package com.usthe.manager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 *
 *
 */

@SpringBootApplication
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = {"com.usthe"})
@EntityScan(basePackages = {"com.usthe"})
public class Manager {

    public static void main(String[] args) {
        SpringApplication.run(Manager.class, args);
    }
}
