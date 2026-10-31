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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.Map;
import java.util.Locale;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Phase12EvidenceContractTest {

    @Test
    void partialMonitorRowsCannotSupportPopulationAttributes() {
        var report = new AgentVerifiedEvidenceReport(false, Locale.ENGLISH);
        report.observe("monitor.query", Map.of(), true,
                "{\"content\":[{\"id\":1, \"name\":\"seed A\", \"status\":1}], \"totalElements\":6}");
        assertTrue(report.active());
        String text = report.render();
        assertTrue(text.contains("1 / 6"));
        assertTrue(text.contains("returned rows only"));
        assertFalse(text.contains("all monitors"));
    }

    @Test
    void unsetIsUnknownEvenWhenErrorCountIsZero() {
        var report = new AgentVerifiedEvidenceReport(false, Locale.ENGLISH);
        report.observe("traces.query", Map.of("start", 1000, "end", 901000), true,
                "{\"content\":[{\"traceId\":\"t1\", \"status\":\"unset\", \"errorSpanCount\":0}], \"totalElements\":1}");
        assertTrue(report.active());
        assertTrue(report.render().contains("UNVERIFIED"));
        assertFalse(report.render().contains("successful trace"));
    }

    @Test
    void crossSignalReportDistinguishesNotQueriedFailedAndEmpty() {
        var report = new AgentVerifiedEvidenceReport(true, Locale.ENGLISH);
        report.observe("metrics.history", Map.of(), true, "{\"totalPoints\":0}");
        report.observe("traces.query", Map.of(), false, null);
        String text = report.render();
        assertTrue(text.contains("logs: NOT_QUERIED"));
        assertTrue(text.contains("traces: FAILED"));
        assertTrue(text.contains("metrics: EMPTY"));
        assertFalse(text.contains("no log tools"));
    }

    @Test
    void unknownPayloadCannotBecomeVerifiedCoverageOrLeakAttributes() {
        var report = new AgentVerifiedEvidenceReport(true, Locale.ENGLISH);
        report.observe("monitor.query", Map.of(), true, "{\"apiKey\":\"DO_NOT_PUBLISH\", \"content\":\"oops\"}");
        assertFalse(report.render().contains("DO_NOT_PUBLISH"));
        assertTrue(report.render().contains("UNKNOWN"));
    }

    @Test
    void windowMustBeAnchoredAndRejectOutsideMissingAndRelativeBounds() {
        var window = AgentRequestedQueryWindow.from("inspect last 15 minutes", 1000000L);
        assertNotNull(window);
        assertEquals(100000L, window.start());
        assertNull(window.denial("traces.query", Map.of("start", 100000L, "end", 1000000L)));
        assertNotNull(window.denial("traces.query", Map.of("start", 99999L, "end", 1000000L)));
        assertNotNull(window.denial("logs.query", Map.of()));
        assertNotNull(window.denial("metrics.history", Map.of("history", "15m")));
        for (String tool : java.util.List.of("traces.list", "traces.get", "traces.structure", "metrics.otlp_console",
                "metrics.otlp_labels", "topology.query", "telemetry.intake_red_summary")) {
            assertNotNull(window.denial(tool, Map.of()));
            assertNull(window.denial(tool, Map.of("start", 100000L, "end", 1000000L)));
        }
        assertNull(window.denial("monitor.query", Map.of()));
        assertNull(window.denial("metrics.realtime", Map.of()));
        assertNull(AgentRequestedQueryWindow.from("inspect last hour", 1000000L));
    }

    @Test
    void nestedQueryAndStrictIntegerBoundsAreEnforced() {
        var window = AgentRequestedQueryWindow.from("last fifteen minutes", 1000000L);
        assertNull(window.denial("logs.query", Map.of("q", Map.of("start", 100000L, "end", 1000000L))));
        assertNotNull(window.denial("logs.query", Map.of("start", 100000.5, "end", 1000000L)));
        assertNotNull(window.denial("logs.query", Map.of("start", 100000L, "end", 1000000L, "q", Map.of("end", 2000000L))));
    }
}
