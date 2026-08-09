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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.SecureRandom;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector;
import org.apache.hertzbeat.manager.setup.config.ManagedActiveConfigurationInspector.State;
import org.apache.hertzbeat.manager.setup.config.SetupInstallationPaths;
import org.apache.hertzbeat.manager.setup.installation.LocalInstallationFingerprintStore;

/** Filesystem-first startup convergence with an explicit legacy/external upgrade entry. */
public final class LocalInstallationStartupProbe implements StartupDecisionProbe {
    private static final String DATASOURCE_PROPERTY = "spring.datasource.url";
    private static final String DATASOURCE_ENVIRONMENT = "SPRING_DATASOURCE_URL";
    private static final String ROOT_ENVIRONMENT = "HERTZBEAT_INTERNAL_INSTALLATION_ROOT";
    private final Path fixedRoot;
    private final Boolean fixedExternalDatabaseConfigured;

    public LocalInstallationStartupProbe() {
        fixedRoot = null;
        fixedExternalDatabaseConfigured = null;
    }

    LocalInstallationStartupProbe(Path root, boolean externalDatabaseConfigured) {
        fixedRoot = root.toAbsolutePath().normalize();
        fixedExternalDatabaseConfigured = externalDatabaseConfigured;
    }

    @Override
    public StartupDecision probe(String[] args) {
        Path root = fixedRoot == null ? installationRoot(args) : fixedRoot;
        boolean externalDatabaseConfigured = fixedExternalDatabaseConfigured == null
                ? externalDatabaseConfigured(args) : fixedExternalDatabaseConfigured;
        State managed = new ManagedActiveConfigurationInspector(root).inspect().state();
        if (managed == State.RECOVERY_REQUIRED) {
            return StartupDecision.recovery();
        }
        FingerprintState fingerprint = fingerprintState(root);
        if (fingerprint == FingerprintState.INVALID) {
            return StartupDecision.recovery();
        }
        boolean legacyDatabase = legacyH2Present(root);
        if (fingerprint == FingerprintState.PRESENT) {
            return managed == State.LOADABLE || legacyDatabase || externalDatabaseConfigured
                    ? new StartupDecision(RuntimeMode.FULL_SETUP_GATED) : StartupDecision.recovery();
        }
        if (managed == State.LOADABLE || legacyDatabase || externalDatabaseConfigured) {
            return new StartupDecision(RuntimeMode.FULL_SETUP_GATED);
        }
        return new StartupDecision(RuntimeMode.SETUP_ONLY);
    }

    private static FingerprintState fingerprintState(Path root) {
        Path path = root.resolve("data/config/.installation-fingerprint");
        try {
            boolean present = new LocalInstallationFingerprintStore(root, path, new SecureRandom()).read().isPresent();
            if (present) {
                return FingerprintState.PRESENT;
            }
            return Files.exists(path, LinkOption.NOFOLLOW_LINKS)
                    ? FingerprintState.INVALID : FingerprintState.ABSENT;
        } catch (IOException failure) {
            return FingerprintState.INVALID;
        }
    }

    private static boolean legacyH2Present(Path root) {
        return Files.isRegularFile(root.resolve("data/hertzbeat.mv.db"))
                || Files.isRegularFile(root.resolve("data/hertzbeat.h2.db"));
    }

    private static Path installationRoot(String[] args) {
        String configured = StartupArgumentProperties.resolve(args, SetupInstallationPaths.ROOT_PROPERTY,
                System.getProperty(SetupInstallationPaths.ROOT_PROPERTY), System.getenv(ROOT_ENVIRONMENT));
        return Path.of(configured == null ? "." : configured).toAbsolutePath().normalize();
    }

    private static boolean externalDatabaseConfigured(String[] args) {
        return hasText(StartupArgumentProperties.resolve(args, DATASOURCE_PROPERTY,
                System.getProperty(DATASOURCE_PROPERTY), System.getenv(DATASOURCE_ENVIRONMENT)));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private enum FingerprintState { ABSENT, PRESENT, INVALID }
}
