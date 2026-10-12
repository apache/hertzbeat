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

package org.apache.hertzbeat.warehouse.repository;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.junit.jupiter.api.Test;

/** Verifies that scoped trace reads cannot fall back to an unscoped repository contract. */
class TraceQueryRepositoryWorkspaceContractTest {

    @Test
    void scopedRecentTraceReadDoesNotDelegateToLegacyUnscopedReader() {
        AtomicBoolean legacyCalled = new AtomicBoolean();
        TraceQueryRepository repository = new TraceQueryRepository() {
            @Override
            public List<Map<String, Object>> queryRecentTraceRows(int limit) {
                legacyCalled.set(true);
                return List.of(Map.of("trace_id", "foreign"));
            }

            @Override
            public List<Map<String, Object>> queryTraceRows(String traceId, int limit) {
                return List.of();
            }
        };

        assertThrows(TelemetryStorageUnavailableException.class, () -> repository.queryRecentTraceRows(
                100, 1_000L, 2_000L, null, null, "prod", "team-b", Map.of(), true));
        assertFalse(legacyCalled.get());
    }
}
