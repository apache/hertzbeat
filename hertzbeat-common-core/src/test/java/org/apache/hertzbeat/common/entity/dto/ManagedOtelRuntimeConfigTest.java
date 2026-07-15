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
import org.junit.jupiter.api.Test;

class ManagedOtelRuntimeConfigTest {

    @Test
    void acceptsVersionedHostMetricsIntent() {
        ManagedOtelRuntimeConfig config = new ManagedOtelRuntimeConfig(1, 7, true, Duration.ofSeconds(30));

        assertEquals(1, config.schemaVersion());
        assertEquals(7, config.revision());
        assertEquals(Duration.ofSeconds(30), config.hostMetricsInterval());
    }

    @Test
    void rejectsUnsupportedSchemaAndUnsafeIntervals() {
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedOtelRuntimeConfig(2, 1, true, Duration.ofSeconds(30)));
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedOtelRuntimeConfig(1, 1, true, Duration.ofSeconds(1)));
    }

    @Test
    void acceptsBoundedPrometheusAndFileLogSources() {
        ManagedOtelRuntimeConfig config = new ManagedOtelRuntimeConfig(
                1,
                8,
                true,
                Duration.ofSeconds(30),
                List.of(new ManagedOtelRuntimeConfig.PrometheusTarget(
                        "payments", URI.create("https://payments.internal:9464/metrics"), Duration.ofSeconds(30))),
                List.of(new ManagedOtelRuntimeConfig.FileLogSource("payments", "payments-logs"))
        );

        assertEquals("payments", config.prometheusTargets().getFirst().name());
        assertEquals("payments-logs", config.fileLogSources().getFirst().pathProfile());
    }

    @Test
    void rejectsCredentialBearingPrometheusTargetsAndDuplicateSourceNames() {
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedOtelRuntimeConfig.PrometheusTarget(
                        "unsafe", URI.create("https://user:secret@example.com/metrics"), Duration.ofSeconds(30)));

        ManagedOtelRuntimeConfig.PrometheusTarget duplicate = new ManagedOtelRuntimeConfig.PrometheusTarget(
                "payments", URI.create("http://127.0.0.1:9464/metrics"), Duration.ofSeconds(30));
        assertThrows(IllegalArgumentException.class,
                () -> new ManagedOtelRuntimeConfig(
                        1, 9, true, Duration.ofSeconds(30), List.of(duplicate, duplicate), List.of()));
    }
}
