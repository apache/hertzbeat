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

import java.net.URI;
import java.time.Duration;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.api.Test;

class OtelRuntimeSourceStatusesTest {

    @Test
    void reportsActivatedSourcesWithoutStaleDesiredEntries() {
        ManagedOtelRuntimeConfig active = config(3, "payments", "payments-logs");

        List<ManagedOtelRuntimeStatus.ManagedOtelSourceStatus> statuses =
                OtelRuntimeSourceStatuses.build(active, active, 3, 0, "");

        assertEquals(3, statuses.size());
        assertEquals(3, statuses.stream()
                .filter(status -> status.state() == ManagedOtelRuntimeStatus.SourceState.ACTIVE)
                .count());
    }

    @Test
    void distinguishesRejectedDesiredSourcesFromStillActiveSources() {
        ManagedOtelRuntimeConfig active = config(3, "payments", "payments-logs");
        ManagedOtelRuntimeConfig desired = config(4, "checkout", "checkout-logs");

        List<ManagedOtelRuntimeStatus.ManagedOtelSourceStatus> statuses =
                OtelRuntimeSourceStatuses.build(active, desired, 3, 4, "Unknown local path profile");

        assertEquals(7, statuses.size());
        assertEquals(3, statuses.stream()
                .filter(status -> status.state() == ManagedOtelRuntimeStatus.SourceState.ACTIVE)
                .count());
        assertEquals(4, statuses.stream()
                .filter(status -> status.state() == ManagedOtelRuntimeStatus.SourceState.REJECTED)
                .count());
    }

    @Test
    void marksRemovedSourceIntentUntilTheNewRevisionActivates() {
        ManagedOtelRuntimeConfig active = config(3, "payments", "payments-logs");
        ManagedOtelRuntimeConfig desired = new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                4,
                true,
                Duration.ofSeconds(30));

        List<ManagedOtelRuntimeStatus.ManagedOtelSourceStatus> pending =
                OtelRuntimeSourceStatuses.build(active, desired, 3, 0, "");

        assertEquals(2, pending.stream()
                .filter(status -> status.state() == ManagedOtelRuntimeStatus.SourceState.DESIRED)
                .count());
    }

    private static ManagedOtelRuntimeConfig config(long revision, String prometheus, String fileLog) {
        return new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION,
                revision,
                true,
                Duration.ofSeconds(30),
                List.of(ManagedOtelRuntimeConfig.PrometheusTarget.basic(
                        prometheus, URI.create("http://127.0.0.1:9464/metrics"), Duration.ofSeconds(30))),
                List.of(new ManagedOtelRuntimeConfig.FileLogSource(fileLog, fileLog))
        );
    }
}
