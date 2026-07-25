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

package org.apache.hertzbeat.ai.gateway.tool.log;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Test bounded and redacted log queries. */
class AgentLogToolServiceTest {

    private HistoryDataReader historyDataReader;
    private AgentLogToolService service;

    @BeforeEach
    void setUp() {
        historyDataReader = mock(HistoryDataReader.class);
        service = new AgentLogToolService(historyDataReader);
    }

    @Test
    void shouldRedactTelemetryBeforeReturningItToModelContext() {
        LogEntry log = LogEntry.builder().timeUnixNano(1_000_000L).severityNumber(17).severityText("ERROR")
                .body("request failed password=super-secret")
                .attributes(Map.of("api_key", "another-secret"))
                .resource(Map.of("service.name", "checkout"))
                .build();
        when(historyDataReader.countLogsByMultipleConditions(1_000L, 2_000L, null, null, 17, "ERROR", null))
                .thenReturn(1L);
        when(historyDataReader.queryLogsByMultipleConditionsWithPagination(
                1_000L, 2_000L, null, null, 17, "ERROR", null, 0, 20)).thenReturn(List.of(log));

        Map<String, Object> result = service.queryLogs(1_000L, 2_000L, null, null, 17, "error",
                null, 0, 20);

        Map<?, ?> row = (Map<?, ?>) ((List<?>) result.get("content")).getFirst();
        assertFalse(((String) row.get("body")).contains("super-secret"));
        assertFalse(((String) row.get("attributes")).contains("another-secret"));
    }

    @Test
    void shouldRejectQueriesWiderThanSevenDays() {
        assertThrows(IllegalArgumentException.class,
                () -> service.queryLogs(1_000L, 1_000L + Duration.ofDays(8).toMillis(), null, null,
                        null, null, null, null, null));
    }
}
