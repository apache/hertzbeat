/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.springframework.boot.env.OriginTrackedMapPropertySource;
import org.springframework.boot.origin.OriginTrackedValue;
import org.springframework.boot.origin.TextResourceOrigin;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;

class SetupStatusProjectionFactoryTest {
    @Test
    void builtInRetentionAndMailDefaultsAreNotReportedAsConfigured() {
        StandardEnvironment environment = new StandardEnvironment();
        TextResourceOrigin origin = new TextResourceOrigin(new ClassPathResource("application.yml"),
                new TextResourceOrigin.Location(1, 1));
        environment.getPropertySources().addLast(new OriginTrackedMapPropertySource("built-in", Map.of(
                "spring.jpa.database", OriginTrackedValue.of("H2", origin),
                "warehouse.store.greptime.enabled", OriginTrackedValue.of("true", origin),
                "warehouse.store.greptime.expire-time", OriginTrackedValue.of("30d", origin),
                "spring.mail.host", OriginTrackedValue.of("smtp.qq.com", origin))));
        var inspection = new ManagedActiveConfigurationInspector.Inspection(
                ManagedActiveConfigurationInspector.State.ABSENT, Map.of(), Map.of());

        var projection = new SetupStatusProjectionFactory().create(environment, inspection);

        assertThat(projection.optional().retentionConfigured()).isFalse();
        assertThat(projection.optional().mailConfigured()).isFalse();
    }

    @Test
    void blankManagedRetentionIsNotReportedAsConfigured() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addLast(new MapPropertySource(
                ManagedActiveConfigurationInspector.MANAGED_APPLICATION_SOURCE,
                Map.of("spring.jpa.database", "H2", "warehouse.store.greptime.enabled", "true",
                        "warehouse.store.greptime.expire-time", " ")));
        var inspection = new ManagedActiveConfigurationInspector.Inspection(
                ManagedActiveConfigurationInspector.State.LOADABLE, Map.of(), Map.of());

        var projection = new SetupStatusProjectionFactory().create(environment, inspection);

        assertThat(projection.optional().retentionConfigured()).isFalse();
    }

    @Test
    void controlOnlyManagedServerEndpointIsNotReportedAsConfigured() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addLast(new MapPropertySource(
                ManagedActiveConfigurationInspector.MANAGED_APPLICATION_SOURCE,
                Map.of("spring.jpa.database", "H2", "warehouse.store.greptime.enabled", "true",
                        "hertzbeat.instrumentation.server.otlp-http-endpoint", "\u0000")));
        var inspection = new ManagedActiveConfigurationInspector.Inspection(
                ManagedActiveConfigurationInspector.State.LOADABLE, Map.of(), Map.of());

        var projection = new SetupStatusProjectionFactory().create(environment, inspection);

        assertThat(projection.optional().serverOtlpHttpConfigured()).isFalse();
    }

    @Test
    void invalidExternalAddressesAreNotReportedAsConfigured() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().replace(
                StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                new MapPropertySource(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME, Map.of(
                "spring.jpa.database", "H2",
                "warehouse.store.greptime.enabled", "true",
                "hertzbeat.setup.public-base-url", "http://0.0.0.0:1157",
                "hertzbeat.instrumentation.server.otlp-http-endpoint", "http://collector.example.test:70000")));
        var inspection = new ManagedActiveConfigurationInspector.Inspection(
                ManagedActiveConfigurationInspector.State.ABSENT, Map.of(), Map.of());

        var projection = new SetupStatusProjectionFactory().create(environment, inspection);

        assertThat(projection.optional().publicBaseUrlConfigured()).isFalse();
        assertThat(projection.optional().serverOtlpHttpConfigured()).isFalse();
    }

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
                        "hertzbeat.setup.public-base-url", "http://hertzbeat.example.test",
                        "hertzbeat.instrumentation.server.otlp-http-endpoint", "http://localhost:4318",
                        "warehouse.store.greptime.expire-time", "30d",
                        "spring.mail.host", "mail.example.test",
                        "spring.mail.properties.mail.smtp.ssl.enable", "false",
                        "spring.mail.properties.mail.smtp.starttls.enable", "false")));
        var inspection = new ManagedActiveConfigurationInspector.Inspection(
                ManagedActiveConfigurationInspector.State.LOADABLE, Map.of(), Map.of());

        var projection = new SetupStatusProjectionFactory().create(environment, inspection);

        assertThat(projection.managementDatabase().kind()).isEqualTo(MetadataDatabaseKind.POSTGRESQL);
        assertThat(projection.managementDatabase().source()).isEqualTo(ConfigSource.SYSTEM_PROPERTY);
        assertThat(projection.optional().publicBaseUrlConfigured()).isTrue();
        assertThat(projection.optional().serverOtlpHttpConfigured()).isTrue();
        assertThat(projection.optional().retentionConfigured()).isTrue();
        assertThat(projection.optional().mailConfigured()).isTrue();
        assertThat(projection.warnings()).containsExactlyInAnyOrder(
                SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT, SetupWarningCode.MAIL_SECURITY_NONE);
    }

    @Test
    void incompleteExternalMailSecurityDoesNotBreakRestartProjection() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().replace(
                StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                new MapPropertySource(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME, Map.of(
                        "spring.jpa.database", "MYSQL",
                        "spring.mail.properties.mail.smtp.ssl.enable", "false")));
        var inspection = new ManagedActiveConfigurationInspector.Inspection(
                ManagedActiveConfigurationInspector.State.ABSENT, Map.of(), Map.of());

        var projection = new SetupStatusProjectionFactory().create(environment, inspection);

        assertThat(projection.warnings()).doesNotContain(SetupWarningCode.MAIL_SECURITY_NONE);
    }
}
