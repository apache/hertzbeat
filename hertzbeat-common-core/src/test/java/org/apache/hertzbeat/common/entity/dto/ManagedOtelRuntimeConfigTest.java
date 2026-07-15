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

package org.apache.hertzbeat.common.entity.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

class ManagedOtelRuntimeConfigTest {

    @Test
    void acceptsVersionedHostMetricsIntent() {
        ManagedOtelRuntimeConfig config = new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION, 7, true, Duration.ofSeconds(30));

        assertEquals(3, config.schemaVersion());
        assertEquals(7, config.revision());
        assertEquals(Duration.ofSeconds(30), config.hostMetricsInterval());
        assertEquals(Set.of(
                ManagedOtelRuntimeConfig.ResourceDetector.ENV,
                ManagedOtelRuntimeConfig.ResourceDetector.SYSTEM), config.resourceDetectors());
        assertEquals(Set.of(), config.telemetryFilterPresets());
    }

    @Test
    void rejectsUnsupportedSchemaAndUnsafeIntervals() {
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedOtelRuntimeConfig(4, 1, true, Duration.ofSeconds(30)));
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedOtelRuntimeConfig(1, 1, true, Duration.ofSeconds(1)));
    }

    @Test
    void acceptsBoundedPrometheusAndFileLogSources() {
        ManagedOtelRuntimeConfig config = new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                8,
                true,
                Duration.ofSeconds(30),
                List.of(ManagedOtelRuntimeConfig.PrometheusTarget.basic(
                        "payments", URI.create("https://payments.internal:9464/metrics"), Duration.ofSeconds(30))),
                List.of(new ManagedOtelRuntimeConfig.FileLogSource("payments", "payments-logs"))
        );

        assertEquals("payments", config.prometheusTargets().getFirst().name());
        assertEquals("payments-logs", config.fileLogSources().getFirst().pathProfile());
    }

    @Test
    void acceptsHostScraperAllowlistAndLocallyResolvedPrometheusOptions() {
        ManagedOtelRuntimeConfig.PrometheusTarget target = new ManagedOtelRuntimeConfig.PrometheusTarget(
                "payments",
                URI.create("https://payments.internal:9464/metrics"),
                Duration.ofSeconds(30),
                Duration.ofSeconds(5),
                Map.of("X-Scrape-Token", "payments-token"),
                "internal-ca"
        );
        ManagedOtelRuntimeConfig config = new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                9,
                true,
                Duration.ofSeconds(30),
                List.of(target),
                List.of(),
                "production",
                null,
                null,
                Set.of(
                        ManagedOtelRuntimeConfig.HostMetricsScraper.CPU,
                        ManagedOtelRuntimeConfig.HostMetricsScraper.MEMORY)
        );

        assertEquals(Duration.ofSeconds(5), target.timeout());
        assertEquals(Map.of("X-Scrape-Token", "payments-token"), target.headerSecretRefs());
        assertEquals(Set.of(
                ManagedOtelRuntimeConfig.HostMetricsScraper.CPU,
                ManagedOtelRuntimeConfig.HostMetricsScraper.MEMORY), config.hostMetricsScrapers());
    }

    @Test
    void rejectsUnsafePrometheusOptionsAndSchemaDowngrade() {
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeConfig.PrometheusTarget(
                "payments",
                URI.create("https://payments.internal:9464/metrics"),
                Duration.ofSeconds(30),
                Duration.ofSeconds(31),
                Map.of(),
                ""
        ));
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeConfig.PrometheusTarget(
                "payments",
                URI.create("https://payments.internal:9464/metrics"),
                Duration.ofSeconds(30),
                Duration.ofSeconds(5),
                Map.of("X-Scrape-Token", "one", "x-scrape-token", "two"),
                ""
        ));
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeConfig.PrometheusTarget(
                "payments",
                URI.create("https://payments.internal:9464/metrics"),
                Duration.ofSeconds(30),
                Duration.ofSeconds(5),
                Map.of("Authorization", "payments-token"),
                ""
        ));
        ManagedOtelRuntimeConfig.PrometheusTarget advanced = new ManagedOtelRuntimeConfig.PrometheusTarget(
                "payments",
                URI.create("https://payments.internal:9464/metrics"),
                Duration.ofSeconds(30),
                Duration.ofSeconds(5),
                Map.of("X-Scrape-Token", "payments-token"),
                "internal-ca"
        );
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeConfig(
                2,
                9,
                true,
                Duration.ofSeconds(30),
                List.of(advanced),
                List.of(),
                "",
                null,
                null,
                null
        ));
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                9,
                true,
                Duration.ofSeconds(30),
                List.of(),
                List.of(),
                "",
                null,
                null,
                Set.of()
        ));
    }

    @Test
    void rejectsCredentialBearingPrometheusTargetsAndDuplicateSourceNames() {
        assertThrows(IllegalArgumentException.class,
                () -> ManagedOtelRuntimeConfig.PrometheusTarget.basic(
                        "unsafe", URI.create("https://user:secret@example.com/metrics"), Duration.ofSeconds(30)));

        ManagedOtelRuntimeConfig.PrometheusTarget duplicate = ManagedOtelRuntimeConfig.PrometheusTarget.basic(
                "payments", URI.create("http://127.0.0.1:9464/metrics"), Duration.ofSeconds(30));
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedOtelRuntimeConfig(
                        1, 9, true, Duration.ofSeconds(30), List.of(duplicate, duplicate), List.of()));
    }

    @Test
    void acceptsOnlyTypedResourceGovernanceIntent() {
        ManagedOtelRuntimeConfig config = new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                10,
                true,
                Duration.ofSeconds(30),
                List.of(),
                List.of(),
                "staging",
                Set.of(
                        ManagedOtelRuntimeConfig.ResourceDetector.SYSTEM,
                        ManagedOtelRuntimeConfig.ResourceDetector.DOCKER,
                        ManagedOtelRuntimeConfig.ResourceDetector.EC2),
                Set.of(ManagedOtelRuntimeConfig.TelemetryFilterPreset.HEALTH_CHECK_TRACES)
        );

        assertEquals("staging", config.environment());
        assertEquals(Set.of(
                ManagedOtelRuntimeConfig.ResourceDetector.SYSTEM,
                ManagedOtelRuntimeConfig.ResourceDetector.DOCKER,
                ManagedOtelRuntimeConfig.ResourceDetector.EC2), config.resourceDetectors());
        assertEquals(Set.of(ManagedOtelRuntimeConfig.TelemetryFilterPreset.HEALTH_CHECK_TRACES),
                config.telemetryFilterPresets());
    }

    @Test
    void rejectsUnsafeEnvironmentNames() {
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                11,
                true,
                Duration.ofSeconds(30),
                List.of(),
                List.of(),
                "production\nprocessors: injected",
                Set.of(),
                Set.of()
        ));
    }

    @Test
    void rejectsGovernanceFieldsOnLegacySchema() {
        assertThrows(IllegalArgumentException.class, () -> new ManagedOtelRuntimeConfig(
                1,
                13,
                true,
                Duration.ofSeconds(30),
                List.of(),
                List.of(),
                "staging",
                Set.of(ManagedOtelRuntimeConfig.ResourceDetector.EC2),
                Set.of(ManagedOtelRuntimeConfig.TelemetryFilterPreset.HEALTH_CHECK_TRACES)
        ));
    }

    @Test
    void readsConfigurationStoredBeforeResourceGovernanceFieldsWereAdded() {
        ManagedOtelRuntimeConfig original = new ManagedOtelRuntimeConfig(
                1, 12, true, Duration.ofSeconds(30), List.of(), List.of());
        String currentJson = JsonUtil.toJson(original);
        String legacyJson = currentJson.substring(0, currentJson.indexOf(",\"environment\"")) + "}";

        ManagedOtelRuntimeConfig restored = JsonUtil.fromJson(legacyJson, ManagedOtelRuntimeConfig.class);

        assertEquals(original.revision(), restored.revision());
        assertEquals(Set.of(
                ManagedOtelRuntimeConfig.ResourceDetector.ENV,
                ManagedOtelRuntimeConfig.ResourceDetector.SYSTEM), restored.resourceDetectors());
        assertEquals(Set.of(), restored.telemetryFilterPresets());
    }

    @Test
    void readsSchemaTwoConfigurationStoredBeforeSourcePolicyFieldsWereAdded() {
        ManagedOtelRuntimeConfig original = new ManagedOtelRuntimeConfig(
                2, 14, true, Duration.ofSeconds(30), List.of(), List.of(), "staging", null, null);
        String currentJson = JsonUtil.toJson(original);
        String schemaTwoJson = currentJson.substring(0, currentJson.indexOf(",\"hostMetricsScrapers\"")) + "}";

        ManagedOtelRuntimeConfig restored = JsonUtil.fromJson(schemaTwoJson, ManagedOtelRuntimeConfig.class);

        assertEquals(14, restored.revision());
        assertEquals(Set.of(
                ManagedOtelRuntimeConfig.HostMetricsScraper.CPU,
                ManagedOtelRuntimeConfig.HostMetricsScraper.DISK,
                ManagedOtelRuntimeConfig.HostMetricsScraper.FILESYSTEM,
                ManagedOtelRuntimeConfig.HostMetricsScraper.LOAD,
                ManagedOtelRuntimeConfig.HostMetricsScraper.MEMORY,
                ManagedOtelRuntimeConfig.HostMetricsScraper.NETWORK,
                ManagedOtelRuntimeConfig.HostMetricsScraper.PAGING,
                ManagedOtelRuntimeConfig.HostMetricsScraper.PROCESSES), restored.hostMetricsScrapers());
    }
}
