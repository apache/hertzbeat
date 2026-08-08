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

package org.apache.hertzbeat.startup.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MailSecurity;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.EffectiveConfigurationResolver;
import org.apache.hertzbeat.manager.setup.config.EffectiveConfigurationValue;
import org.apache.hertzbeat.manager.setup.config.GreptimeEndpoints;
import org.apache.hertzbeat.manager.setup.config.GreptimeSettings;
import org.apache.hertzbeat.manager.setup.config.ManagedApplicationConfig;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedOptionalConfiguration;
import org.apache.hertzbeat.manager.setup.config.ManagedSecrets;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.RestartRequirement;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementReader;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Authentication;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Gateway;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.apache.hertzbeat.startup.instrumentation.ExternalOtelCollectorIntakeProperties;
import org.apache.hertzbeat.startup.instrumentation.ManagerInstrumentationIntakeProfileStore;
import org.apache.hertzbeat.startup.instrumentation.ServerInstrumentationIntakeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

class ManagedConfigDataPrecedenceTest {

    private static final String KEY = "spring.datasource.username";
    private static final String SECRET_KEY = "spring.datasource.password";
    private static final String INSTALLATION_ROOT = "hertzbeat.internal.installation-root";
    private static final String TEST_PASSWORD =
            " \\=:#!\t\r\n\fGrüße-${UNRESOLVED_TEST_SECRET}-\\${ESCAPED_TEST_SECRET} ";

    @TempDir
    private Path temporaryDirectory;

    @Test
    void realConfigDataHonorsEverySupportedPrecedenceLayerAndOrigin() throws Exception {
        Path installationRoot = Files.createDirectories(temporaryDirectory.resolve("installation"));
        ManagedSecrets managedSecrets = ManagedSecrets.withoutTelemetryPassword(SecretValue.of(TEST_PASSWORD));
        ManagedConfigurationTransaction transaction = new ManagedConfigurationTransaction(installationRoot);
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                transaction.apply(new ManagedConfigurationBundle(managedApplication(), managedSecrets)));
        Path emptyInstallationRoot = Files.createDirectories(temporaryDirectory.resolve("empty-installation"));
        Path externalDirectory = Files.createDirectories(temporaryDirectory.resolve("external"));
        Files.writeString(externalDirectory.resolve("application.yml"), yaml("external"));

        assertLayer(Map.of(INSTALLATION_ROOT, emptyInstallationRoot.toString()), Map.of(),
                new String[0], "sa", "class path resource", ConfigSource.BUILT_IN_DEFAULT);
        assertLayer(Map.of(INSTALLATION_ROOT, installationRoot.toString()), Map.of(),
                new String[0], "managed", ManagedActiveConfigurationInspector.MANAGED_APPLICATION_SOURCE,
                ConfigSource.UI_MANAGED);
        assertLayer(Map.of(INSTALLATION_ROOT, installationRoot.toString()), Map.of(),
                new String[] {"--spring.profiles.active=managed-proof"},
                "managed", ManagedActiveConfigurationInspector.MANAGED_APPLICATION_SOURCE,
                ConfigSource.UI_MANAGED);
        assertLayer(Map.of(
                        INSTALLATION_ROOT, installationRoot.toString(),
                        "spring.config.additional-location", externalDirectory.toUri().toString()),
                Map.of(), new String[0], "external", "application.yml", ConfigSource.EXTERNAL_FILE);
        assertLayer(Map.of(INSTALLATION_ROOT, installationRoot.toString()),
                Map.of("SPRING_DATASOURCE_USERNAME", "environment"),
                new String[0], "environment", StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                ConfigSource.ENVIRONMENT);
        assertLayer(Map.of(INSTALLATION_ROOT, installationRoot.toString(), KEY, "system"),
                Map.of("SPRING_DATASOURCE_USERNAME", "environment"),
                new String[0], "system", StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                ConfigSource.SYSTEM_PROPERTY);
        assertLayer(Map.of(INSTALLATION_ROOT, installationRoot.toString(), KEY, "system"),
                Map.of("SPRING_DATASOURCE_USERNAME", "environment"),
                new String[] {"--" + KEY + "=cli"}, "cli", "commandLineArgs", ConfigSource.COMMAND_LINE);
    }

    @Test
    void managedOptionalSettingsReachRuntimeConsumers() throws Exception {
        Path installationRoot = Files.createDirectories(temporaryDirectory.resolve("runtime-consumers"));
        ManagedSecrets managedSecrets = new ManagedSecrets(SecretValue.of(TEST_PASSWORD), Optional.empty(),
                Optional.of(SecretValue.of("mail-secret")));
        ManagedConfigurationTransaction transaction = new ManagedConfigurationTransaction(installationRoot);
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                transaction.apply(new ManagedConfigurationBundle(managedApplicationWithOptions(), managedSecrets)));

        ConfigurableEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("testInstallationRoot",
                Map.of(INSTALLATION_ROOT, installationRoot.toString())));
        SpringApplication application = new SpringApplication(RuntimeConsumerBinding.class);
        application.setEnvironment(environment);
        application.setWebApplicationType(WebApplicationType.NONE);
        application.setLogStartupInfo(false);
        try (ConfigurableApplicationContext context = application.run()) {
            ServerInstrumentationIntakeProperties server =
                    context.getBean(ServerInstrumentationIntakeProperties.class);
            assertEquals("http://server.example.test:4318", server.otlpHttpEndpoint());
            assertEquals("https://server.example.test:4317", server.otlpGrpcEndpoint());
            CollectorDao collectorDao = mock(CollectorDao.class);
            when(collectorDao.findAll(any(Pageable.class))).thenReturn(Page.empty());
            var profile = new ManagerInstrumentationIntakeProfileStore(
                    collectorDao, mock(CollectorIntakeAdvertisementReader.class), server,
                    new ExternalOtelCollectorIntakeProperties(null, null, null, null))
                    .profiles().getFirst();
            assertEquals("server-direct", profile.id());
            assertEquals(Availability.AVAILABLE, profile.availability());
            assertEquals(Gateway.SERVER, profile.gateway());
            assertEquals(Authentication.BEARER_TOKEN, profile.authentication());
            assertEquals(java.util.List.of(OtlpTransport.HTTP_PROTOBUF, OtlpTransport.GRPC),
                    profile.supportedTransports());
            assertEquals("30d", context.getBean(GreptimeProperties.class).expireTime());
            assertEquals("true", context.getEnvironment().getProperty(
                    "spring.mail.properties.mail.smtp.ssl.enable"));
            assertEquals("false", context.getEnvironment().getProperty(
                    "spring.mail.properties.mail.smtp.starttls.enable"));
            assertEquals("alerts@example.test",
                    context.getEnvironment().getProperty("hertzbeat.mail.from-address"));
        }
    }

    private static void assertLayer(
            Map<String, Object> systemProperties,
            Map<String, Object> environmentVariables,
            String[] arguments,
            String expected,
            String originFragment,
            ConfigSource expectedSource) {
        ConfigurableEnvironment environment = new StandardEnvironment();
        Map<String, Object> systemValues = new LinkedHashMap<>(systemProperties);
        systemValues.putIfAbsent("PID", "managed-config-test");
        environment.getPropertySources().replace(
                StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                new MapPropertySource(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                        systemValues));
        environment.getPropertySources().replace(
                StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                new SystemEnvironmentPropertySource(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                        new LinkedHashMap<>(environmentVariables)));
        SpringApplication application = new SpringApplication(ProbeConfiguration.class);
        application.setEnvironment(environment);
        application.setWebApplicationType(WebApplicationType.NONE);
        application.setLogStartupInfo(false);
        try (ConfigurableApplicationContext context = application.run(arguments)) {
            assertEquals(expected, context.getEnvironment().getProperty(KEY));
            if (expectedSource == ConfigSource.UI_MANAGED) {
                assertEquals(TEST_PASSWORD, context.getEnvironment().getProperty(SECRET_KEY));
            }
            PropertySource<?> winner = winningSource(context.getEnvironment(), KEY);
            if (expectedSource == ConfigSource.UI_MANAGED) {
                assertEquals(originFragment, winner.getName());
            } else {
                assertTrue(winner.getName().contains(originFragment), winner.getName());
            }
            EffectiveConfigurationValue<String> resolved = new EffectiveConfigurationResolver().resolve(
                    context.getEnvironment(), KEY, RestartRequirement.RESTART_REQUIRED);
            assertEquals(expected, resolved.value());
            assertEquals(expectedSource, resolved.source());
            assertEquals(RestartRequirement.RESTART_REQUIRED, resolved.restartRequirement());
        }
    }

    private static PropertySource<?> winningSource(ConfigurableEnvironment environment, String key) {
        for (PropertySource<?> source : environment.getPropertySources()) {
            if (!"configurationProperties".equals(source.getName()) && source.getProperty(key) != null) {
                return source;
            }
        }
        throw new AssertionError("No property source for " + key);
    }

    private static String yaml(String username) {
        return "spring:\n  datasource:\n    username: " + username + "\n";
    }

    private static ManagedApplicationConfig managedApplication() {
        return new ManagedApplicationConfig(
                new MetadataDatabaseSettings(
                        MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db/hertzbeat", "managed"),
                GreptimeSettings.anonymous(
                        new GreptimeEndpoints("greptime:4001", "http://greptime:4000"), "public"));
    }

    private static ManagedApplicationConfig managedApplicationWithOptions() {
        ManagedOptionalConfiguration options = new ManagedOptionalConfiguration(
                Optional.of(new ManagedOptionalConfiguration.ServerInstrumentationSettings(
                        Optional.of("http://server.example.test:4318"),
                        Optional.of("https://server.example.test:4317"))),
                Optional.of(new ManagedOptionalConfiguration.RetentionSettings(30)),
                Optional.of(new ManagedOptionalConfiguration.MailSettings("smtp.example.test", 465,
                        MailSecurity.TLS, Optional.of("mailer@example.test"), "alerts@example.test")));
        ManagedApplicationConfig required = managedApplication();
        return new ManagedApplicationConfig(required.metadataDatabase(), required.telemetryStore(), options);
    }

    @Configuration(proxyBeanMethods = false)
    static class ProbeConfiguration {
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties({ServerInstrumentationIntakeProperties.class, GreptimeProperties.class})
    static class RuntimeConsumerBinding {
    }
}
