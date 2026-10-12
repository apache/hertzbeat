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

package org.apache.hertzbeat.startup.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.GreptimeEndpoints;
import org.apache.hertzbeat.manager.setup.config.GreptimeSettings;
import org.apache.hertzbeat.manager.setup.config.ManagedApplicationConfig;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedSecrets;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.context.ConfigurableApplicationContext;

class ManagedConfigRecoveryContextTest {

    @TempDir
    private Path temporaryDirectory;

    @ParameterizedTest
    @EnumSource(BrokenActivePair.class)
    void brokenActivePairFallsBackToRealRecoveryContext(BrokenActivePair brokenPair) throws Exception {
        Path installationRoot = Files.createDirectories(
                temporaryDirectory.resolve(brokenPair.name().toLowerCase(java.util.Locale.ROOT)));
        brokenPair.create(installationRoot);
        HertzBeatStartupCoordinator coordinator = new HertzBeatStartupCoordinator(
                ignored -> StartupDecision.normal(), new SpringStartupContextLauncher());

        coordinator.start(new String[] {
                "--hertzbeat.internal.installation-root=" + installationRoot,
                "--hertzbeat.runtime.mode=normal",
                "--server.port=0",
                "--spring.main.banner-mode=off"
        });

        assertEquals(RuntimeMode.RECOVERY, coordinator.mode());
        coordinator.currentContext().close();
    }

    @ParameterizedTest
    @EnumSource(BrokenActivePair.class)
    void commandLineCannotMakeSetupOnlyLoadBrokenManagedFiles(BrokenActivePair brokenPair) throws Exception {
        Path installationRoot = Files.createDirectories(
                temporaryDirectory.resolve("setup-" + brokenPair.name().toLowerCase(java.util.Locale.ROOT)));
        brokenPair.create(installationRoot);
        StartupDecision setupOnly = new StartupDecision(RuntimeMode.SETUP_ONLY);

        try (ConfigurableApplicationContext context = new SpringStartupContextLauncher().launchSpringContext(
                setupOnly,
                new String[] {
                        "--hertzbeat.internal.installation-root=" + installationRoot,
                        "--hertzbeat.runtime.mode=normal",
                        "--server.port=0",
                        "--spring.main.banner-mode=off"
                }, () -> { })) {
            assertEquals(RuntimeMode.SETUP_ONLY.value(),
                    context.getEnvironment().getProperty(RuntimeMode.PROPERTY_NAME));
        }
    }

    private enum BrokenActivePair {
        CORRUPT {
            @Override
            void create(Path root) throws Exception {
                createValidPair(root);
                Files.writeString(root.resolve("data/config/managed-application.yml"),
                        "spring.datasource.username: tampered\n");
            }
        },
        UNREADABLE {
            @Override
            void create(Path root) throws Exception {
                createValidPair(root);
                Path application = root.resolve("data/config/managed-application.yml");
                Files.delete(application);
                Files.createDirectory(application);
            }
        },
        GENERATION_MISMATCH {
            @Override
            void create(Path root) throws Exception {
                Path applicationPair = root.resolve("application-pair");
                Path secretPair = root.resolve("secret-pair");
                createValidPair(applicationPair);
                createValidPair(secretPair);
                Path config = Files.createDirectories(root.resolve("data/config"));
                Files.copy(applicationPair.resolve("data/config/managed-application.yml"),
                        config.resolve("managed-application.yml"));
                Files.copy(secretPair.resolve("data/config/managed-secrets.properties"),
                        config.resolve("managed-secrets.properties"));
            }
        };

        abstract void create(Path root) throws Exception;
    }

    private static void createValidPair(Path installationRoot) throws Exception {
        ManagedConfigurationTransaction transaction = new ManagedConfigurationTransaction(installationRoot);
        assertEquals(ManagedConfigurationTransaction.Outcome.APPLIED,
                transaction.apply(new ManagedConfigurationBundle(configuration(), secrets())));
    }

    private static ManagedApplicationConfig configuration() {
        return new ManagedApplicationConfig(
                new MetadataDatabaseSettings(
                        MetadataDatabaseKind.POSTGRESQL, "jdbc:postgresql://db/hertzbeat", "hertzbeat"),
                GreptimeSettings.anonymous(
                        new GreptimeEndpoints("greptime:4001", "http://greptime:4000"), "public"));
    }

    private static ManagedSecrets secrets() {
        return ManagedSecrets.withoutTelemetryPassword(SecretValue.of("recovery-test-password"));
    }
}
