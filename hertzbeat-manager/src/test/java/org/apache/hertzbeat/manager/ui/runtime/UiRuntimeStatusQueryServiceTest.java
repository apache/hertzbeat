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

import static org.apache.hertzbeat.common.constants.CommonConstants.COLLECTOR_STATUS_OFFLINE;
import static org.apache.hertzbeat.common.constants.CommonConstants.COLLECTOR_STATUS_ONLINE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorDao.CollectorStatusInventory;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeStatusRegistry.ReportedStatus;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.ErrorCode;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.RuntimeStatusResponse;
import org.apache.hertzbeat.manager.ui.runtime.UiRuntimeStatusContract.State;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Real UI runtime aggregation contracts without loading Collector CLOB fields. */
class UiRuntimeStatusQueryServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-22T03:04:05Z");

    private UiRuntimeStorageStatusProbe storageProbe;
    private CollectorDao collectorDao;
    private CollectorRuntimeStatusRegistry runtimeStatusRegistry;

    @BeforeEach
    void setUp() {
        storageProbe = mock(UiRuntimeStorageStatusProbe.class);
        collectorDao = mock(CollectorDao.class);
        runtimeStatusRegistry = mock(CollectorRuntimeStatusRegistry.class);
        when(storageProbe.isAvailable()).thenReturn(true);
        when(collectorDao.findStatusInventory()).thenReturn(List.of());
    }

    @Test
    void mapsStorageAvailableUnavailableAndQueryFailure() {
        when(storageProbe.isAvailable()).thenReturn(true, false).thenThrow(new IllegalStateException("private detail"));

        assertEquals(State.AVAILABLE, service().current().storage().status());
        RuntimeStatusResponse unavailable = service().current();
        assertEquals(State.UNAVAILABLE, unavailable.storage().status());
        assertEquals(ErrorCode.STORAGE_UNAVAILABLE, unavailable.storage().errorCode());
        RuntimeStatusResponse failed = service().current();
        assertEquals(State.UNAVAILABLE, failed.storage().status());
        assertEquals(ErrorCode.STORAGE_QUERY_FAILED, failed.storage().errorCode());
    }

    @Test
    void mapsZeroAllOfflinePartialAndAllOnlineInventory() {
        RuntimeStatusResponse empty = service().current();
        assertCollectors(empty, State.DEGRADED, 0, 0, 0);

        when(collectorDao.findStatusInventory()).thenReturn(List.of(inventory("a", COLLECTOR_STATUS_OFFLINE)));
        assertCollectors(service().current(), State.DEGRADED, 1, 0, 0);

        when(collectorDao.findStatusInventory()).thenReturn(List.of(
                inventory("a", COLLECTOR_STATUS_ONLINE), inventory("b", COLLECTOR_STATUS_OFFLINE)));
        assertCollectors(service().current(), State.DEGRADED, 2, 1, 0);

        when(collectorDao.findStatusInventory()).thenReturn(List.of(
                inventory("a", COLLECTOR_STATUS_ONLINE), inventory("b", COLLECTOR_STATUS_ONLINE)));
        assertCollectors(service().current(), State.AVAILABLE, 2, 2, 0);
    }

    @Test
    void countsOnlyFreshEnabledRunningFailureFreeManagedRuntimes() {
        when(collectorDao.findStatusInventory()).thenReturn(List.of(
                inventory("healthy", COLLECTOR_STATUS_ONLINE),
                inventory("disabled", COLLECTOR_STATUS_ONLINE),
                inventory("agentless", COLLECTOR_STATUS_ONLINE)));
        when(runtimeStatusRegistry.current("healthy"))
                .thenReturn(Optional.of(reported(runtimeStatus(true,
                        ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                        ManagedOtelRuntimeStatus.FailureCode.NONE), NOW.minusSeconds(4))));
        when(runtimeStatusRegistry.current("disabled"))
                .thenReturn(Optional.of(reported(runtimeStatus(false,
                        ManagedOtelRuntimeStatus.RuntimeState.STOPPED,
                        ManagedOtelRuntimeStatus.FailureCode.NONE), NOW.minusSeconds(3))));

        RuntimeStatusResponse response = service().current();

        assertCollectors(response, State.AVAILABLE, 3, 3, 1);
        assertEquals(NOW.minusSeconds(3), response.collectors().lastReportedAt());
        verify(runtimeStatusRegistry).current("agentless");
    }

    @Test
    void degradesForFreshEnabledRuntimeFailureAndUsesLatestFreshReportTime() {
        when(collectorDao.findStatusInventory()).thenReturn(List.of(
                inventory("healthy", COLLECTOR_STATUS_ONLINE), inventory("failed", COLLECTOR_STATUS_ONLINE)));
        when(runtimeStatusRegistry.current("healthy"))
                .thenReturn(Optional.of(reported(runtimeStatus(true,
                        ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                        ManagedOtelRuntimeStatus.FailureCode.NONE), NOW.minusSeconds(5))));
        when(runtimeStatusRegistry.current("failed"))
                .thenReturn(Optional.of(reported(runtimeStatus(true,
                        ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                        ManagedOtelRuntimeStatus.FailureCode.BACKEND_UNAVAILABLE), NOW.minusSeconds(2))));

        RuntimeStatusResponse response = service().current();

        assertCollectors(response, State.DEGRADED, 2, 2, 1);
        assertEquals(NOW.minusSeconds(2), response.collectors().lastReportedAt());
    }

    @Test
    void degradesForFreshEnabledRuntimeThatIsNotRunning() {
        when(collectorDao.findStatusInventory()).thenReturn(List.of(inventory("starting", COLLECTOR_STATUS_ONLINE)));
        when(runtimeStatusRegistry.current("starting"))
                .thenReturn(Optional.of(reported(runtimeStatus(true,
                        ManagedOtelRuntimeStatus.RuntimeState.STARTING,
                        ManagedOtelRuntimeStatus.FailureCode.NONE), NOW.minusSeconds(2))));

        assertCollectors(service().current(), State.DEGRADED, 1, 1, 0);
    }

    @Test
    void ignoresStaleOrMissingManagedRuntimeReports() {
        when(collectorDao.findStatusInventory()).thenReturn(List.of(inventory("stale", COLLECTOR_STATUS_ONLINE)));
        when(runtimeStatusRegistry.current("stale")).thenReturn(Optional.empty());

        RuntimeStatusResponse response = service().current();

        assertCollectors(response, State.AVAILABLE, 1, 1, 0);
        assertNull(response.collectors().lastReportedAt());
    }

    @Test
    void collectorInventoryFailureReturnsNoInferredCounts() {
        when(collectorDao.findStatusInventory()).thenThrow(new IllegalStateException("database-private-detail"));

        RuntimeStatusResponse response = service().current();

        assertEquals(State.UNAVAILABLE, response.collectors().status());
        assertEquals(ErrorCode.COLLECTOR_STATUS_UNAVAILABLE, response.collectors().errorCode());
        assertNull(response.collectors().total());
        assertNull(response.collectors().online());
        assertNull(response.collectors().runtimeHealthy());
        assertNull(response.collectors().lastReportedAt());
    }

    @Test
    void realQueryJsonEnvelopeContainsOnlySafeAggregates() throws Exception {
        when(collectorDao.findStatusInventory()).thenReturn(List.of(inventory("edge-west", COLLECTOR_STATUS_ONLINE)));
        when(runtimeStatusRegistry.current("edge-west")).thenReturn(Optional.of(reported(runtimeStatus(true,
                ManagedOtelRuntimeStatus.RuntimeState.RUNNING,
                ManagedOtelRuntimeStatus.FailureCode.NONE), NOW.minusSeconds(1))));
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new UiRuntimeStatusController(service())).build();

        String json = mockMvc.perform(MockMvcRequestBuilders.get("/api/ui/runtime-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.observedAt").value("2026-07-22T03:04:05Z"))
                .andExpect(jsonPath("$.data.server.status").value("available"))
                .andExpect(jsonPath("$.data.storage.status").value("available"))
                .andExpect(jsonPath("$.data.collectors.runtimeHealthy").value(1))
                .andReturn().getResponse().getContentAsString();

        assertFalse(json.contains("pid"));
        assertFalse(json.contains("lastError"));
        assertFalse(json.toLowerCase().contains("token"));
        assertFalse(json.contains("private detail"));
    }

    private UiRuntimeStatusQueryService service() {
        return new UiRuntimeStatusQueryService(
                storageProbe, collectorDao, runtimeStatusRegistry, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private CollectorStatusInventory inventory(String name, byte status) {
        return new InventoryRow(name, status);
    }

    private ReportedStatus reported(ManagedOtelRuntimeStatus status, Instant receivedAt) {
        return new ReportedStatus(status, receivedAt);
    }

    private ManagedOtelRuntimeStatus runtimeStatus(boolean enabled, ManagedOtelRuntimeStatus.RuntimeState state,
                                                   ManagedOtelRuntimeStatus.FailureCode failureCode) {
        return new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                enabled,
                state,
                1,
                enabled ? 1 : 0,
                -1,
                ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED,
                0,
                NOW.minusSeconds(10),
                "private runtime detail",
                failureCode,
                ManagedOtelRuntimeStatus.RuntimeTelemetry.unavailable(false),
                List.of());
    }

    private void assertCollectors(RuntimeStatusResponse response, State state, int total, int online,
                                  int runtimeHealthy) {
        assertEquals(state, response.collectors().status());
        assertEquals(total, response.collectors().total());
        assertEquals(online, response.collectors().online());
        assertEquals(runtimeHealthy, response.collectors().runtimeHealthy());
        assertEquals(state == State.AVAILABLE ? null : ErrorCode.COLLECTOR_STATUS_UNAVAILABLE,
                response.collectors().errorCode());
    }

    private record InventoryRow(String name, byte status) implements CollectorStatusInventory {

        @Override
        public String getName() {
            return name;
        }

        @Override
        public byte getStatus() {
            return status;
        }
    }
}
