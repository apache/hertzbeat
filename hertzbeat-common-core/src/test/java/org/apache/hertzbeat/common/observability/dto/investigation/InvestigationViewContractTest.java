/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.observability.dto.investigation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class InvestigationViewContractTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void serializesFrozenTraceContractAndBoundedEnumCodes() throws Exception {
        TraceInvestigationView view = new TraceInvestigationView(
                "0123456789abcdef0123456789abcdef",
                null,
                new InvestigationWindow(100L, 200L),
                TraceInvestigationView.GanttBlock.empty(),
                TraceInvestigationView.LogsBlock.empty(),
                TraceInvestigationView.RedBlock.unavailable(
                        InvestigationReason.IDENTITY_UNAVAILABLE, null),
                TraceInvestigationView.MetricsBlock.unavailable(
                        InvestigationReason.QUERY_STRATEGY_UNAVAILABLE),
                TraceInvestigationView.DependenciesBlock.empty());

        String json = jsonMapper.writeValueAsString(view);

        assertEquals("empty", jsonMapper.readTree(json).path("gantt").path("state").asText());
        assertEquals("no_data", jsonMapper.readTree(json).path("gantt").path("reason").asText());
        assertEquals("greptime_traces", jsonMapper.readTree(json).path("gantt").path("source").asText());
        assertEquals("query_strategy_unavailable",
                jsonMapper.readTree(json).path("metrics").path("reason").asText());
        assertEquals(100L, jsonMapper.readTree(json).path("window").path("start").asLong());
        assertEquals(200L, jsonMapper.readTree(json).path("window").path("end").asLong());
    }

    @Test
    void logWireKeepsNanosecondTimestampsAsDecimalStrings() throws Exception {
        InvestigationServiceIdentity identity = new InvestigationServiceIdentity(
                "team-a", "7", "service", "checkout", "payments", "prod");
        InvestigationLogRecord selected = new InvestigationLogRecord(
                "event-7",
                "1787934874782123456",
                "1787934874782123999",
                17,
                "ERROR",
                "checkout failed",
                "0123456789abcdef0123456789abcdef",
                "0123456789abcdef",
                identity,
                Map.of("http.route", "/checkout"),
                Map.of("service.name", "checkout"));
        LogInvestigationView view = new LogInvestigationView(
                "event-7",
                new InvestigationWindow(1787934874000L, 1787934875000L),
                LogInvestigationView.SelectedLogBlock.ready(selected),
                LogInvestigationView.TraceBlock.empty(InvestigationReason.NOT_CORRELATED),
                LogInvestigationView.MetricsBlock.unavailable(
                        InvestigationReason.QUERY_STRATEGY_UNAVAILABLE),
                LogInvestigationView.NearbyLogsBlock.empty());

        String json = jsonMapper.writeValueAsString(view);

        assertEquals("1787934874782123456",
                jsonMapper.readTree(json).path("selectedLog").path("log").path("timeUnixNano").asText());
        assertEquals("1787934874782123999",
                jsonMapper.readTree(json).path("selectedLog").path("log").path("observedTimeUnixNano").asText());
    }

    @Test
    void rejectsUppercasePersistedLogCorrelationIdentifiers() {
        assertThrows(IllegalArgumentException.class, () -> new InvestigationLogRecord(
                "event-7", "1787934874782123456", null, 17, "ERROR", "failed",
                "0123456789ABCDEF0123456789ABCDEF", "0123456789ABCDEF", null, Map.of(), Map.of()));
    }

    @Test
    void rejectsReadyEvidenceWithoutObservedValuesAndInvalidWindow() {
        assertThrows(IllegalArgumentException.class,
                () -> new InvestigationWindow(100L, 100L));
        assertThrows(IllegalArgumentException.class,
                () -> new InvestigationServiceIdentity(
                        "team-a\nleak", "7", "service", "checkout", null, null));
        assertThrows(IllegalArgumentException.class,
                () -> new InvestigationServiceIdentity(
                        "team-a", "not-a-positive-id", "service", "checkout", null, null));
        assertThrows(IllegalArgumentException.class,
                () -> new InvestigationServiceIdentity(
                        "team-a", "7", "service", " ", null, null));
        assertThrows(IllegalArgumentException.class,
                () -> new TraceInvestigationView.LogsBlock(
                        InvestigationEvidenceState.READY,
                        InvestigationReason.OBSERVED,
                        InvestigationSource.GREPTIME_LOGS,
                        false,
                        List.of()));
        assertThrows(IllegalArgumentException.class,
                () -> new LogInvestigationView.SelectedLogBlock(
                        InvestigationEvidenceState.UNAVAILABLE,
                        InvestigationReason.STORAGE_UNAVAILABLE,
                        InvestigationSource.GREPTIME_LOGS,
                        new InvestigationLogRecord(
                                "event-7", "1", null, null, null, null, null, null,
                                null, Map.of(), Map.of())));
    }

    @Test
    void serializesFrozenAlertInvestigationContract() throws Exception {
        AlertInvestigationView view = new AlertInvestigationView(
                7L,
                new AlertInvestigationView.Window(100L, 200L, 150L),
                new AlertInvestigationView.AlertHeader("High latency", "firing", "critical", "slow", null,
                        Map.of("service.name", "checkout"), Map.of()),
                AlertInvestigationView.IdentityBlock.ready(new AlertInvestigationView.AlertIdentity(
                        "checkout", "payments", "prod", 11L, "service", 22L, null, null)),
                AlertInvestigationView.MetricsBlock.unavailable(InvestigationReason.QUERY_STRATEGY_UNAVAILABLE),
                AlertInvestigationView.LogsBlock.empty(),
                AlertInvestigationView.TracesBlock.empty(),
                AlertInvestigationView.TopologyBlock.empty(),
                AlertInvestigationView.CollectionBlock.empty());

        var json = jsonMapper.readTree(jsonMapper.writeValueAsString(view));

        assertEquals("persisted_alert", json.path("identity").path("source").asText());
        assertEquals("otlp_metrics", json.path("metrics").path("source").asText());
        assertEquals("greptime_logs", json.path("logs").path("source").asText());
        assertEquals("greptime_traces", json.path("traces").path("source").asText());
        assertEquals("greptime_semantic_graph", json.path("topology").path("source").asText());
        assertEquals("greptime_collection_events", json.path("collection").path("source").asText());
        assertEquals(150L, json.path("window").path("anchor").asLong());
        assertEquals(0, json.path("logs").path("records").size());
        assertEquals(false, json.path("traces").path("truncated").asBoolean());
        assertEquals(true, json.path("collection").path("event").isNull());
    }

    @Test
    void rejectsAlertEvidenceThatContradictsItsStateOrBounds() {
        assertThrows(IllegalArgumentException.class,
                () -> new AlertInvestigationView.Window(100L, 200L, 200L));
        assertThrows(IllegalArgumentException.class,
                () -> new AlertInvestigationView.AlertIdentity(
                        null, null, null, -1L, "service", null, null, null));
        assertEquals(7L, AlertInvestigationView.IdentityBlock.ready(
                new AlertInvestigationView.AlertIdentity(
                        null, null, null, 7L, null, null, null, null)).identity().entityId());
        assertThrows(IllegalArgumentException.class,
                () -> new AlertInvestigationView.LogsBlock(
                        InvestigationEvidenceState.READY, InvestigationReason.OBSERVED,
                        InvestigationSource.GREPTIME_LOGS, List.of(), false));
        assertThrows(IllegalArgumentException.class,
                () -> new AlertInvestigationView.CollectionBlock(
                        InvestigationEvidenceState.EMPTY, InvestigationReason.NO_DATA,
                        InvestigationSource.GREPTIME_COLLECTION_EVENTS,
                        new AlertInvestigationView.CollectionEvent(
                                150L, 1L, "success", null, null, null, null, null, 1, 1)));
        assertEquals(-1L, new AlertInvestigationView.CollectionEvent(
                150L, -1L, "unknown", null, null, null, null, null, 0, 0).durationMillis());
        assertThrows(IllegalArgumentException.class, () -> new AlertInvestigationView.TopologyEdge(
                150L, "service", "a", "service", "b", "calls", "trace", 1D, 1L, 2L));
    }
}
