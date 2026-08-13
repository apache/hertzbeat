/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.bootstrap.SetupOnlyApplication;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.config.GreptimeEndpoints;
import org.apache.hertzbeat.manager.setup.config.GreptimeSettings;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.apache.hertzbeat.manager.setup.config.ManagedApplicationConfig;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedSecrets;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.manager.setup.workflow.FileMigrationOperationStore;
import org.apache.hertzbeat.manager.setup.workflow.MigrationOperationSnapshot;
import org.apache.hertzbeat.startup.HertzBeatApplication;
import org.apache.hertzbeat.startup.config.ManagedConfigEnvironmentPostProcessor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.boot.env.OriginTrackedMapPropertySource;
import org.springframework.boot.origin.OriginTrackedValue;
import org.springframework.boot.origin.TextResourceOrigin;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.SimpleCommandLinePropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;

class ManagedMigrationSpringAdmissionTest {

    @TempDir
    private Path root;

    @Test
    void directFullApplicationWithoutLauncherTokenFailsBeforeBeanCreation() {
        StandardEnvironment environment = environment();

        assertThatThrownBy(() -> process(environment, HertzBeatApplication.class))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause()
                .hasMessage("Managed migration startup admission failed");
    }

    @Test
    void publicRootAwareLauncherStillCannotIssueAdmissionToken() {
        SpringStartupContextLauncher launcher = new SpringStartupContextLauncher();
        StartupDecision decision = new StartupDecision(RuntimeMode.FULL_SETUP_GATED);

        assertThatThrownBy(() -> {
            try (RunningApplicationContext ignored = launcher.launch(
                    decision,
                    new String[] {
                            "--spring.profiles.active=test",
                            "--spring.main.web-application-type=none",
                            "--spring.datasource.url=jdbc:h2:mem:public-launch;MODE=MYSQL;DB_CLOSE_DELAY=-1",
                            "--spring.flyway.enabled=false"
                    }, () -> { }, root, null)) {
                throw new AssertionError("Public launch unexpectedly crossed startup admission");
            }
        }).isInstanceOf(IllegalStateException.class)
                .hasNoCause()
                .hasMessage("Managed migration startup admission failed");
    }

    @Test
    void ordinaryPropertiesCannotForgeTheLauncherToken() {
        StandardEnvironment environment = environment();
        environment.getPropertySources().addFirst(new SimpleCommandLinePropertySource(
                "--hertzbeat.internal.startup-admission=trusted"));

        assertThatThrownBy(() -> process(environment, HertzBeatApplication.class))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause();
    }

    @Test
    void setupOnlyRemainsReachableWithoutFullApplicationToken() {
        assertThatCode(() -> process(environment(), SetupOnlyApplication.class))
                .doesNotThrowAnyException();
        StandardEnvironment publicLaunch = environment();
        publicLaunch.getPropertySources().addFirst(StartupLaunchAdmission.runtimeModePropertySource(
                new StartupDecision(RuntimeMode.SETUP_ONLY)));
        assertThatCode(() -> process(publicLaunch, SetupOnlyApplication.class))
                .doesNotThrowAnyException();
    }

    @Test
    void untrustedSetupModesCannotBypassAdmissionForFullApplicationSources() {
        for (RuntimeMode mode : new RuntimeMode[] { RuntimeMode.SETUP_ONLY, RuntimeMode.RECOVERY }) {
            for (Object source : new Object[] { HertzBeatApplication.class, HertzBeatApplication.class.getName() }) {
                StandardEnvironment environment = environment();
                environment.getPropertySources().addFirst(StartupLaunchAdmission.runtimeModePropertySource(
                        new StartupDecision(mode)));

                assertThatThrownBy(() -> process(environment, source))
                        .isInstanceOf(IllegalStateException.class)
                        .hasNoCause()
                        .hasMessage("Managed migration startup admission failed");
            }
        }
    }

    @Test
    void admittedSetupOnlyLaunchSanitizesCapabilityBeforeBeansCanObserveIt() throws Exception {
        assertAdmittedSetupSourceSanitizedAndNotReplayable(RuntimeMode.SETUP_ONLY);
    }

    @Test
    void admittedRecoveryLaunchSanitizesCapabilityBeforeBeansCanObserveIt() throws Exception {
        assertAdmittedSetupSourceSanitizedAndNotReplayable(RuntimeMode.RECOVERY);
    }

    @Test
    void setupOnlyClassAndClassNameBypassCorruptManagedPair() throws Exception {
        Path config = Files.createDirectories(root.resolve("data/config"));
        Files.writeString(config.resolve("managed-application.yml"), "invalid");

        assertThatCode(() -> process(environment(), SetupOnlyApplication.class))
                .doesNotThrowAnyException();
        assertThatCode(() -> process(environment(), SetupOnlyApplication.class.getName()))
                .doesNotThrowAnyException();
    }

    @Test
    void fullApplicationClassNameRequiresExactLauncherAdmission() {
        assertThatThrownBy(() -> process(environment(), HertzBeatApplication.class.getName()))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause()
                .hasMessage("Managed migration startup admission failed");
    }

    @Test
    void trustedFullLaunchStillFailsClosedForNonterminalMigration() {
        seedPending();
        StandardEnvironment environment = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED));

        assertThatThrownBy(() -> process(environment, HertzBeatApplication.class))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause();
    }

    @Test
    void trustedFullLaunchIsAdmittedWhenMigrationJournalIsClear() {
        assertThatCode(() -> process(
                trustedEnvironment(new StartupDecision(RuntimeMode.FULL_SETUP_GATED)),
                HertzBeatApplication.class)).doesNotThrowAnyException();
    }

    @Test
    void admittedPropertySourceCannotBeReplayedForAnotherInstallationRoot() throws Exception {
        Path firstRoot = Files.createDirectories(root.resolve("first"));
        Path secondRoot = root.resolve("second");
        StandardEnvironment admitted = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED), firstRoot,
                StartupLaunchAdmission.Mode.ORDINARY);
        process(admitted, HertzBeatApplication.class);
        MapPropertySource exposed = (MapPropertySource) admitted.getPropertySources()
                .get(StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE);
        Map<String, Object> replay = new LinkedHashMap<>(exposed.getSource());
        replay.put(SetupInstallationPaths.ROOT_PROPERTY, secondRoot.toString());
        StandardEnvironment direct = environment(secondRoot);
        direct.getPropertySources().addFirst(
                new MapPropertySource(StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE, replay));

        assertThatThrownBy(() -> process(direct, HertzBeatApplication.class))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause()
                .hasMessage("Managed migration startup admission failed");
    }

    @Test
    void launcherAdmissionCannotBeRedirectedToHigherPrecedenceInstallationRoot() throws Exception {
        Path issuedRoot = Files.createDirectories(root.resolve("issued"));
        Path redirectedRoot = Files.createDirectories(root.resolve("redirected"));
        StandardEnvironment environment = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED), issuedRoot,
                StartupLaunchAdmission.Mode.ORDINARY);
        environment.getPropertySources().addBefore(
                StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE,
                new MapPropertySource("higher-precedence-root",
                        Map.of(SetupInstallationPaths.ROOT_PROPERTY, redirectedRoot.toString())));

        assertThatThrownBy(() -> process(environment, HertzBeatApplication.class))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause()
                .hasMessage("Managed migration startup admission failed");
    }

    @Test
    void exactManagedReloadRequiresLoadableManagedConfiguration() {
        StandardEnvironment environment = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);

        assertRejected(environment);
    }

    @Test
    void successfulAdmissionSanitizesCapabilityAndStillInsertsManagedSources() throws Exception {
        applyManagedConfiguration();
        StandardEnvironment environment = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);

        process(environment, HertzBeatApplication.class);

        MapPropertySource sanitized = (MapPropertySource) environment.getPropertySources()
                .get(StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE);
        assertThat(sanitized.getSource()).containsOnlyKeys(
                RuntimeMode.PROPERTY_NAME, SetupInstallationPaths.ROOT_PROPERTY);
        assertThat(environment.getPropertySources()
                .get(ManagedActiveConfigurationInspector.MANAGED_APPLICATION_SOURCE)).isNotNull();
        assertThat(environment.getPropertySources()
                .get(ManagedActiveConfigurationInspector.MANAGED_SECRET_SOURCE)).isNotNull();
    }

    @Test
    void exactManagedReloadIgnoresAttachedAggregateViewOfClasspathDatasource() throws Exception {
        applyManagedConfiguration();
        StandardEnvironment environment = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);
        TextResourceOrigin origin = new TextResourceOrigin(
                new ClassPathResource("application.yml"),
                new TextResourceOrigin.Location(1, 1));
        environment.getPropertySources().addLast(new OriginTrackedMapPropertySource(
                "Config resource 'class path resource [application.yml]'",
                Map.of("spring.datasource.url", OriginTrackedValue.of("classpath-default", origin))));
        ConfigurationPropertySources.attach(environment);

        assertThatCode(() -> process(environment, HertzBeatApplication.class))
                .doesNotThrowAnyException();
    }

    @Test
    void exactManagedReloadRejectsDatasourceIdentityOverridesFromEveryExternalSource() throws Exception {
        applyManagedConfiguration();
        for (String property : new String[] {
                "spring.datasource.url", "spring.datasource.username", "spring.datasource.password",
                "spring.datasource.driver-class-name", "spring.datasource.jndi-name", "spring.datasource.type",
                "spring.datasource.hikari.data-source-properties.socketFactory",
                "spring.datasource.hikari.jdbc-url"
        }) {
            StandardEnvironment commandLine = trustedEnvironment(
                    new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                    StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);
            commandLine.getPropertySources().addAfter(
                    StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE,
                    new SimpleCommandLinePropertySource("--" + property + "=private-value"));
            assertRejected(commandLine);
        }

        StandardEnvironment system = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);
        system.getPropertySources().replace(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                new MapPropertySource(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME,
                        Map.of("spring.datasource.url", "private-value")));
        assertRejected(system);

        StandardEnvironment environment = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);
        environment.getPropertySources().replace(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                new SystemEnvironmentPropertySource(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                        new LinkedHashMap<>(Map.of("SPRING_DATASOURCE_PASSWORD", "private-value"))));
        assertRejected(environment);

        StandardEnvironment externalFile = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);
        TextResourceOrigin origin = new TextResourceOrigin(
                new FileSystemResource(root.resolve("external-application.yml")),
                new TextResourceOrigin.Location(1, 1));
        externalFile.getPropertySources().addAfter(
                StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE,
                new OriginTrackedMapPropertySource("Config resource 'external-application.yml'",
                        Map.of("spring.datasource.url", OriginTrackedValue.of("private-value", origin))));
        assertRejected(externalFile);
    }

    @Test
    void exactManagedReloadFailsClosedForNonEnumerableHigherPrecedenceSources() throws Exception {
        applyManagedConfiguration();
        StandardEnvironment finiteIdentity = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);
        finiteIdentity.getPropertySources().addAfter(
                StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE,
                nonEnumerable("finite-identity", "spring.datasource.password"));
        assertRejected(finiteIdentity);

        StandardEnvironment unknownKeys = trustedEnvironment(
                new StartupDecision(RuntimeMode.FULL_SETUP_GATED),
                StartupLaunchAdmission.Mode.EXACT_MANAGED_DATASOURCE);
        unknownKeys.getPropertySources().addAfter(
                StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE,
                nonEnumerable("unknown-keys", null));
        assertRejected(unknownKeys);
    }

    private void assertRejected(StandardEnvironment environment) {
        assertThatThrownBy(() -> process(environment, HertzBeatApplication.class))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause()
                .hasMessage("Managed migration startup admission failed")
                .hasMessageNotContaining("private-value");
    }

    private void assertAdmittedSetupSourceSanitizedAndNotReplayable(RuntimeMode mode) throws Exception {
        Path firstRoot = Files.createDirectories(root.resolve(mode.value()).resolve("first"));
        Path secondRoot = root.resolve(mode.value()).resolve("second");
        StandardEnvironment admitted = trustedEnvironment(
                new StartupDecision(mode), firstRoot, StartupLaunchAdmission.Mode.ORDINARY);

        process(admitted, SetupOnlyApplication.class);

        MapPropertySource sanitized = (MapPropertySource) admitted.getPropertySources()
                .get(StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE);
        assertThat(sanitized.getSource()).containsOnlyKeys(
                RuntimeMode.PROPERTY_NAME, SetupInstallationPaths.ROOT_PROPERTY);
        Map<String, Object> replay = new LinkedHashMap<>(sanitized.getSource());
        replay.put(SetupInstallationPaths.ROOT_PROPERTY, secondRoot.toString());
        StandardEnvironment direct = environment(secondRoot);
        direct.getPropertySources().addFirst(
                new MapPropertySource(StartupLaunchAdmission.INTERNAL_PROPERTY_SOURCE, replay));
        assertThatThrownBy(() -> process(direct, HertzBeatApplication.class))
                .isInstanceOf(IllegalStateException.class)
                .hasNoCause()
                .hasMessage("Managed migration startup admission failed");
    }

    private StandardEnvironment trustedEnvironment(StartupDecision decision) {
        return trustedEnvironment(decision, StartupLaunchAdmission.Mode.ORDINARY);
    }

    private StandardEnvironment trustedEnvironment(
            StartupDecision decision, StartupLaunchAdmission.Mode mode) {
        return trustedEnvironment(decision, root, mode);
    }

    private StandardEnvironment trustedEnvironment(
            StartupDecision decision, Path installationRoot, StartupLaunchAdmission.Mode mode) {
        StandardEnvironment environment = environment(installationRoot);
        environment.getPropertySources().addFirst(
                StartupLaunchAdmission.internalPropertySource(decision, installationRoot, mode));
        return environment;
    }

    private StandardEnvironment environment() {
        return environment(root);
    }

    private StandardEnvironment environment(Path installationRoot) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource(
                "test-installation-root",
                Map.of(SetupInstallationPaths.ROOT_PROPERTY, installationRoot.toString())));
        return environment;
    }

    private PropertySource<Object> nonEnumerable(String name, String visibleKey) {
        return new PropertySource<>(name, new Object()) {
            @Override
            public Object getProperty(String name) {
                return name.equals(visibleKey) ? "private-value" : null;
            }
        };
    }

    private void applyManagedConfiguration() throws IOException {
        ManagedApplicationConfig application = new ManagedApplicationConfig(
                new MetadataDatabaseSettings(
                        MetadataDatabaseKind.H2, "jdbc:h2:file:./data/hertzbeat", "sa"),
                GreptimeSettings.anonymous(
                        new GreptimeEndpoints("greptime:4001", "http://greptime:4000"), "public"));
        try (ManagedSecrets secrets = ManagedSecrets.withoutTelemetryPassword(
                SecretValue.of("managed-password"))) {
            new ManagedConfigurationTransaction(root).apply(
                    new ManagedConfigurationBundle(application, secrets));
        }
    }

    private void process(StandardEnvironment environment, Object source) {
        SpringApplication application;
        if (source instanceof Class<?> sourceClass) {
            application = new SpringApplication(sourceClass);
        } else {
            application = new SpringApplication();
            application.setSources(Set.of((String) source));
        }
        new ManagedConfigEnvironmentPostProcessor().postProcessEnvironment(
                environment, application);
    }

    private void seedPending() {
        new FileMigrationOperationStore(root).create(
                new MigrationOperationSnapshot(
                        "operation-a", MigrationOperationState.PENDING, MigrationTarget.POSTGRESQL,
                        ApplyMode.MANAGED_WRITE, MigrationStage.QUEUED, 0,
                        Instant.parse("2026-08-10T09:00:00Z"), null, null,
                        VerificationState.PENDING, null, null, 1000,
                        false, false, false, "a".repeat(64), "candidate-generation"));
    }
}
