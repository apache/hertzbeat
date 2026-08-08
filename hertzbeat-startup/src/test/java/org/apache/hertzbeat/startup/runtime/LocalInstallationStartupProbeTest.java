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
import java.security.SecureRandom;
import org.apache.hertzbeat.common.runtime.RuntimeMode;
import org.apache.hertzbeat.manager.setup.config.GreptimeEndpoints;
import org.apache.hertzbeat.manager.setup.config.GreptimeSettings;
import org.apache.hertzbeat.manager.setup.config.ManagedApplicationConfig;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedSecrets;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.installation.LocalInstallationFingerprintStore;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalInstallationStartupProbeTest {
    @TempDir
    private Path root;

    @Test
    void freshRootStartsSetupOnlyAndLegacyDatabaseStartsGated() throws Exception {
        assertEquals(RuntimeMode.SETUP_ONLY, new LocalInstallationStartupProbe(root, false).probe().mode());
        Files.createDirectories(root.resolve("data"));
        Files.createFile(root.resolve("data/hertzbeat.mv.db"));
        assertEquals(RuntimeMode.FULL_SETUP_GATED,
                new LocalInstallationStartupProbe(root, false).probe().mode());
    }

    @Test
    void localFingerprintCanNeverOpenBusinessRuntimeWithoutDatabaseComparison() throws Exception {
        new ManagedConfigurationTransaction(root).apply(bundle());
        assertEquals(RuntimeMode.FULL_SETUP_GATED,
                new LocalInstallationStartupProbe(root, false).probe().mode());
        new LocalInstallationFingerprintStore(root.resolve("data/config/.installation-fingerprint"),
                new SecureRandom()).create();
        assertEquals(RuntimeMode.FULL_SETUP_GATED,
                new LocalInstallationStartupProbe(root, false).probe().mode());
    }

    private static ManagedConfigurationBundle bundle() {
        ManagedApplicationConfig application = new ManagedApplicationConfig(
                new MetadataDatabaseSettings(
                        org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind.H2,
                        "jdbc:h2:./data/hertzbeat", "sa"),
                GreptimeSettings.anonymous(new GreptimeEndpoints(
                        "localhost:4001", "http://localhost:4000"), "public"));
        return new ManagedConfigurationBundle(application,
                ManagedSecrets.withoutTelemetryPassword(SecretValue.of("password")));
    }
}
