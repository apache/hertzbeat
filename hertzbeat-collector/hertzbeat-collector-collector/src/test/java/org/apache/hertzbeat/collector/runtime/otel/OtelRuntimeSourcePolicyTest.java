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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeSourcePolicyTest {

    @TempDir
    private Path tempDir;

    @Test
    void resolvesOnlyLocallyApprovedFileProfiles() throws Exception {
        Path applicationLogs = Files.createDirectories(tempDir.resolve("applications/payments"));
        OtelRuntimeProperties properties = propertiesFor(
                Map.of("payments-logs", List.of(applicationLogs.resolve("*.log").toString())));
        ManagedOtelRuntimeConfig config = configWithProfile("payments-logs");

        OtelRuntimeSourcePolicy.ResolvedSources resolved = new OtelRuntimeSourcePolicy().resolve(config, properties);

        assertEquals(List.of(applicationLogs.resolve("*.log").toString()),
                resolved.fileLogSources().getFirst().includePatterns());
    }

    @Test
    void rejectsUnknownProfilesTraversalAndDeniedPaths() throws Exception {
        Path denied = Files.createDirectories(tempDir.resolve("applications/private"));
        OtelRuntimeProperties unknown = propertiesFor(Map.of());
        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeSourcePolicy().resolve(configWithProfile("missing"), unknown));

        OtelRuntimeProperties traversal = propertiesFor(
                Map.of("escape", List.of(tempDir.resolve("applications/../outside/*.log").toString())));
        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeSourcePolicy().resolve(configWithProfile("escape"), traversal));

        OtelRuntimeProperties deniedProperties = propertiesFor(
                Map.of("private", List.of(denied.resolve("*.log").toString())));
        deniedProperties.setFileLogDenyPaths(List.of(denied));
        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeSourcePolicy().resolve(configWithProfile("private"), deniedProperties));
    }

    @Test
    void rejectsRecursiveGlobsAndSymlinkEscape() throws Exception {
        Path allowed = Files.createDirectories(tempDir.resolve("applications"));
        OtelRuntimeProperties recursive = propertiesFor(
                Map.of("recursive", List.of(allowed.resolve("**/*.log").toString())));
        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeSourcePolicy().resolve(configWithProfile("recursive"), recursive));

        Path outside = Files.createDirectories(tempDir.resolve("outside"));
        Path link = allowed.resolve("linked");
        try {
            Files.createSymbolicLink(link, outside);
        } catch (java.io.IOException | UnsupportedOperationException exception) {
            return;
        }
        OtelRuntimeProperties symlink = propertiesFor(
                Map.of("linked", List.of(link.resolve("*.log").toString())));
        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeSourcePolicy().resolve(configWithProfile("linked"), symlink));
    }

    @Test
    void resolvesOnlyKnownPrometheusSecretAndTlsProfiles() throws Exception {
        Path caFile = Files.writeString(tempDir.resolve("internal-ca.pem"), "test-ca");
        OtelRuntimeProperties properties = propertiesFor(Map.of());
        properties.setPrometheusHeaderSecrets(Map.of("payments-token", "secret"));
        properties.setPrometheusTlsCaProfiles(Map.of("internal-ca", caFile));
        ManagedOtelRuntimeConfig config = configWithPrometheus("payments-token", "internal-ca");

        OtelRuntimeSourcePolicy.ResolvedSources resolved = new OtelRuntimeSourcePolicy().resolve(config, properties);

        OtelRuntimeSourcePolicy.ResolvedPrometheusTarget target = resolved.prometheusTargets().getFirst();
        assertEquals(caFile.toRealPath(), target.tlsCaFile());
        assertEquals(1, target.headerSecretEnvironment().size());
    }

    @Test
    void rejectsUnknownPrometheusSecretAndTlsProfiles() throws Exception {
        OtelRuntimeProperties properties = propertiesFor(Map.of());
        assertThrows(IllegalArgumentException.class, () -> new OtelRuntimeSourcePolicy().resolve(
                configWithPrometheus("missing-token", ""), properties));
        properties.setPrometheusHeaderSecrets(Map.of("payments-token", "secret"));
        assertThrows(IllegalArgumentException.class, () -> new OtelRuntimeSourcePolicy().resolve(
                configWithPrometheus("payments-token", "missing-ca"), properties));
    }

    @Test
    void rejectsProfilesThatAlreadyMatchMoreThanTheFileCeiling() throws Exception {
        Path allowed = Files.createDirectories(tempDir.resolve("applications/many"));
        for (int index = 0; index < 257; index++) {
            Files.createFile(allowed.resolve("application-" + index + ".log"));
        }
        OtelRuntimeProperties properties = propertiesFor(
                Map.of("many", List.of(allowed.resolve("*.log").toString())));

        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeSourcePolicy().resolve(configWithProfile("many"), properties));
    }

    @Test
    void appliesTheFileCeilingAcrossAllPatternsInOneSource() throws Exception {
        Path first = Files.createDirectories(tempDir.resolve("applications/first"));
        Path second = Files.createDirectories(tempDir.resolve("applications/second"));
        for (int index = 0; index < 130; index++) {
            Files.createFile(first.resolve("first-" + index + ".log"));
            Files.createFile(second.resolve("second-" + index + ".log"));
        }
        OtelRuntimeProperties properties = propertiesFor(Map.of(
                "many", List.of(first.resolve("*.log").toString(), second.resolve("*.log").toString())));

        assertThrows(IllegalArgumentException.class,
                () -> new OtelRuntimeSourcePolicy().resolve(configWithProfile("many"), properties));
    }

    private OtelRuntimeProperties propertiesFor(Map<String, List<String>> profiles) throws Exception {
        Path allowed = Files.createDirectories(tempDir.resolve("applications"));
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setFileLogAllowRoots(List.of(allowed));
        properties.setFileLogProfiles(profiles);
        return properties;
    }

    private static ManagedOtelRuntimeConfig configWithProfile(String profile) {
        return new ManagedOtelRuntimeConfig(
                1,
                1,
                true,
                Duration.ofSeconds(30),
                List.of(),
                List.of(new ManagedOtelRuntimeConfig.FileLogSource("payments", profile))
        );
    }

    private static ManagedOtelRuntimeConfig configWithPrometheus(String secretRef, String tlsProfile) {
        return new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                1,
                true,
                Duration.ofSeconds(30),
                List.of(new ManagedOtelRuntimeConfig.PrometheusTarget(
                        "payments",
                        java.net.URI.create("https://127.0.0.1:9464/metrics"),
                        Duration.ofSeconds(30),
                        Duration.ofSeconds(5),
                        Map.of("X-Scrape-Token", secretRef),
                        tlsProfile)),
                List.of(),
                "",
                null,
                null,
                null
        );
    }
}
