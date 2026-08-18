/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationInitializer;
import org.springframework.boot.flyway.autoconfigure.FlywayProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;

/**
 * Flyway database migration config.
 * Delays Flyway execution until after Hibernate has created/updated the schema.
 */
@Configuration
@Slf4j
@ConditionalOnProperty(prefix = "spring.flyway", name = "enabled", havingValue = "true")
public class FlywayConfiguration {

    /**
     * Disable the default FlywayMigrationInitializer by providing an empty callback.
     */
    @Bean
    public FlywayMigrationInitializer flywayInitializer(Flyway flyway) {
        return new FlywayMigrationInitializer(flyway, (f) -> {
            // Empty callback - we'll run migrations manually after Hibernate
        });
    }

    /**
     * Delayed Flyway migration that runs after EntityManagerFactory is initialized.
     * This ensures Hibernate's ddl-auto runs first to create/update tables,
     * then Flyway can perform additional migrations if needed.
     */
    @Bean
    @DependsOn("entityManagerFactory")
    Dummy delayedFlywayInitializer(Flyway flyway, FlywayProperties flywayProperties) {
        if (flywayProperties.isEnabled()) {
            try {
                flyway.migrate();
            } catch (FlywayValidateException e) {
                if (e.getMessage() == null || !e.getMessage().contains("failed migration")) {
                    // checksum mismatches and other validation problems need a human decision
                    throw e;
                }
                // a recorded failed migration blocks every later start; repair + one retry un-bricks it
                log.warn("Flyway history has a failed migration, repairing and retrying once: {}", e.getMessage());
                flyway.repair();
                flyway.migrate();
            }
        }
        return new Dummy();
    }

    static class Dummy {
    }
}
