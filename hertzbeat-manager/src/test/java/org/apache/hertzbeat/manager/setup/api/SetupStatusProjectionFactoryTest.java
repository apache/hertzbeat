/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

class SetupStatusProjectionFactoryTest {
    @Test
    void restartProjectionUsesEffectiveSourceAndRehydratesSafeManagedOptions() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().replace(
                StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                new MapPropertySource(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                        Map.of("spring.jpa.database", "POSTGRESQL")));
        environment.getPropertySources().addLast(new MapPropertySource(
                ManagedActiveConfigurationInspector.MANAGED_APPLICATION_SOURCE,
                Map.of("spring.jpa.database", "H2",
                        "warehouse.store.greptime.enabled", "true",
                        "hertzbeat.setup.public-base-url", "http://localhost:1157",
                        "hertzbeat.setup.retention.metrics-days", "30",
                        "spring.mail.host", "mail.example.test",
                        "hertzbeat.setup.mail.security", "NONE")));
        var inspection = new ManagedActiveConfigurationInspector.Inspection(
                ManagedActiveConfigurationInspector.State.LOADABLE, Map.of(), Map.of());

        var projection = new SetupStatusProjectionFactory().create(environment, inspection);

        assertThat(projection.managementDatabase().kind()).isEqualTo(MetadataDatabaseKind.POSTGRESQL);
        assertThat(projection.managementDatabase().source()).isEqualTo(ConfigSource.SYSTEM_PROPERTY);
        assertThat(projection.optional().publicAccessConfigured()).isTrue();
        assertThat(projection.optional().retentionConfigured()).isTrue();
        assertThat(projection.optional().mailConfigured()).isTrue();
        assertThat(projection.warnings()).containsExactlyInAnyOrder(
                SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT, SetupWarningCode.MAIL_SECURITY_NONE);
    }

    @Test
    void unknownExternalMailSecurityDoesNotBreakRestartProjection() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().replace(
                StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                new MapPropertySource(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME, Map.of(
                        "spring.jpa.database", "MYSQL",
                        "hertzbeat.setup.mail.security", "legacy-value")));
        var inspection = new ManagedActiveConfigurationInspector.Inspection(
                ManagedActiveConfigurationInspector.State.ABSENT, Map.of(), Map.of());

        var projection = new SetupStatusProjectionFactory().create(environment, inspection);

        assertThat(projection.warnings()).doesNotContain(SetupWarningCode.MAIL_SECURITY_NONE);
    }
}
