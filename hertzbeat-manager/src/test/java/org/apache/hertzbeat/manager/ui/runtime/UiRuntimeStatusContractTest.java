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

package org.apache.hertzbeat.manager.ui.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.RecordComponent;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.CollectorsStatus;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.ComponentStatus;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.ErrorCode;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.RuntimeStatusResponse;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.State;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.StorageKind;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.StorageStatus;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Guards the exact versioned UI runtime-status API surface. */
class UiRuntimeStatusContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void freezesRuntimeStatusRecordFieldsAndWireEnums() {
        assertRecordComponents(RuntimeStatusResponse.class, "schemaVersion", "observedAt", "server", "storage", "collectors");
        assertRecordComponents(ComponentStatus.class, "status", "errorCode");
        assertRecordComponents(StorageStatus.class, "kind", "status", "errorCode");
        assertRecordComponents(
                CollectorsStatus.class,
                "status",
                "total",
                "online",
                "runtimeHealthy",
                "lastReportedAt",
                "errorCode");
        assertWireValues(State.values(), "available", "degraded", "unavailable", "unknown");
        assertWireValues(StorageKind.values(), "greptime");
        assertWireValues(
                ErrorCode.values(),
                "server_unavailable",
                "storage_unavailable",
                "storage_query_failed",
                "collector_status_unavailable");
    }

    @Test
    void freezesGetRuntimeStatusPathAndEnvelope() throws Exception {
        RuntimeStatusResponse response = new RuntimeStatusResponse(
                1,
                Instant.parse("2026-07-22T01:02:03Z"),
                new ComponentStatus(State.AVAILABLE, null),
                new StorageStatus(StorageKind.GREPTIME, State.DEGRADED, ErrorCode.STORAGE_UNAVAILABLE),
                new CollectorsStatus(
                        State.AVAILABLE,
                        3,
                        2,
                        1,
                        Instant.parse("2026-07-22T01:02:00Z"),
                        null));
        UiRuntimeStatusQuery query = () -> response;
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new UiRuntimeStatusController(query)).build();

        mockMvc.perform(MockMvcRequestBuilders.get("/api/ui/runtime-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.schemaVersion").value(1))
                .andExpect(jsonPath("$.data.server.status").value("available"))
                .andExpect(jsonPath("$.data.storage.kind").value("greptime"))
                .andExpect(jsonPath("$.data.storage.status").value("degraded"))
                .andExpect(jsonPath("$.data.collectors.status").value("available"))
                .andExpect(jsonPath("$.data.collectors.runtimeHealthy").value(1))
                .andExpect(jsonPath("$.data.collectors.lastReportedAt").value("2026-07-22T01:02:00Z"));
    }

    @Test
    void contractOnlyFallbackIsUnknownWithNoDevelopmentErrorCode() {
        RuntimeStatusResponse response = new UnknownUiRuntimeStatusQuery().current();

        assertEquals(State.UNKNOWN, response.server().status());
        assertNull(response.server().errorCode());
        assertEquals(State.UNKNOWN, response.storage().status());
        assertNull(response.storage().errorCode());
        assertEquals(State.UNKNOWN, response.collectors().status());
        assertNull(response.collectors().errorCode());
    }

    @Test
    void degradedAndUnavailableStatusesRequireStableErrorCode() {
        assertThrows(IllegalArgumentException.class, () -> new ComponentStatus(State.DEGRADED, null));
        assertThrows(IllegalArgumentException.class, () -> new ComponentStatus(State.UNAVAILABLE, null));
    }

    private void assertRecordComponents(Class<? extends Record> recordType, String... expectedNames) {
        assertEquals(
                List.of(expectedNames),
                Arrays.stream(recordType.getRecordComponents()).map(RecordComponent::getName).toList());
    }

    private void assertWireValues(Enum<?>[] values, String... expectedValues) {
        assertEquals(List.of(expectedValues), Arrays.stream(values).map(this::serializeEnum).toList());
    }

    private String serializeEnum(Enum<?> value) {
        try {
            return objectMapper.writeValueAsString(value).replace("\"", "");
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
