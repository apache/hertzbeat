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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.Locale;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AgentCompletionCoverageTest {
    @Test
    void nativeAlertResultPageIsCountedWithoutInventingAbsoluteTimeCoverage() {
        var report = AgentVerifiedEvidenceReport.forRequest("Inspect monitors/alerts, metrics, logs and traces", Locale.ENGLISH);
        report.observe("monitor.query", Map.of(), true, "{\"content\":[],\"totalElements\":0}");
        report.observe("alert.query", Map.of("alertType", "single", "pageSize", 5), true,
                "{\"alertType\":\"single\",\"result\":{\"content\":[{\"id\":1}],\"totalElements\":1,\"pageIndex\":0,\"pageSize\":5}}");
        assertTrue(report.render().contains("alert: OBSERVED"));
        assertTrue(report.render().contains("alert.query: 1 / 1"));
        assertTrue(report.render().contains("snapshot"));
        var partial = AgentVerifiedEvidenceReport.forRequest("Inspect monitors/alerts, metrics, logs and traces", Locale.ENGLISH);
        partial.observe("alert.query", Map.of("pageSize", 5), true,
                "{\"alertType\":\"single\",\"result\":{\"content\":[{\"id\":1}],\"totalElements\":9,\"pageIndex\":0,\"pageSize\":5}}");
        assertTrue(partial.render().contains("alert: PARTIAL"));
    }

    @Test
    void fullPlatformQuestionCannotCloseAfterOnlyThreeSignalReads() {
        for (String question : java.util.List.of("Inspect monitors/alerts, metrics, logs and traces",
                java.util.ResourceBundle.getBundle("agent.final-audit", Locale.ROOT).getString("platform"))) {
            var report = AgentVerifiedEvidenceReport.forRequest(question, Locale.ENGLISH);
            report.observe("metrics.history", Map.of(), true, "{\"totalPoints\":0}");
            report.observe("logs.query", Map.of(), true, "{\"content\":[],\"totalElements\":0}");
            report.observe("traces.query", Map.of(), true, "{\"content\":[],\"totalElements\":0}");
            assertTrue(report.needsCoverage());
            assertTrue(report.coverageFailure().contains("monitor"));
            assertTrue(report.coverageFailure().contains("alert"));
            report.observe("monitor.query", Map.of(), true, "{\"content\":[],\"totalElements\":0}");
            assertTrue(report.needsCoverage());
            report.observe("alert.query", Map.of(), true, "{\"alertType\":\"single\",\"result\":{\"content\":[],\"totalElements\":0}}");
            assertFalse(report.needsCoverage());
        }
    }

    @Test
    void logMetadataAndValidationDoNotSatisfyRequestedDataCoverage() {
        var report = AgentVerifiedEvidenceReport.forRequest("cross-signal logs", Locale.ENGLISH);
        for (String tool : java.util.List.of("logs.facet_fields", "logs.facet_values", "logs.live.validate", "logs.validate_calculated")) {
            report.observe(tool, Map.of(), true, "{\"total\":1}");
        }
        assertTrue(report.needsCoverage());
        report.observe("logs.analysis", Map.of(), true, "{\"matchingTotal\":0,\"truncated\":false}");
        assertFalse(report.needsCoverage());
    }

    @Test
    void partialEmptyInventoryCannotEstablishThatNoSeriesExists() {
        var report = AgentVerifiedEvidenceReport.forRequest("cross-signal metrics", Locale.ENGLISH);
        report.observe("metrics.otlp_inventory", Map.of("q", Map.of("entityId", 42, "start", 1000, "end", 901000)), true,
                "{\"partial\":true,\"format\":\"json_text\",\"data\":\"{\\\"code\\\":0,\\\"data\\\":{\\\"items\\\":[],\\\"truncated\\\":false}}\"}");
        assertTrue(report.needsCoverage());
        assertFalse(report.render().contains("no metric name is available"));
    }

    @Test
    void totalMonitorCapIsPreservedWhilePerPageCapAllowsContinuation() {
        var capped = AgentVerifiedEvidenceReport.forRequest("complete monitor overview, at most 5 monitors", Locale.ENGLISH);
        assertFalse(capped.needsCoverage());
        var paged = AgentVerifiedEvidenceReport.forRequest("all monitors, at most 5 monitors per page", Locale.ENGLISH);
        assertTrue(paged.needsCoverage());
        var both = AgentVerifiedEvidenceReport.forRequest("all monitors, at most 5 monitors per page, at most 10 monitors", Locale.ENGLISH);
        assertFalse(both.needsCoverage());
    }

    @Test
    void threeNamedSignalsAreRequiredIndependentOfWordOrder() {
        var report = AgentVerifiedEvidenceReport.forRequest("Inspect traces, logs and metrics", Locale.ENGLISH);
        report.observe("traces.query", Map.of(), true, "{\"content\":[],\"totalElements\":0}");
        report.observe("logs.query", Map.of(), true, "{\"content\":[],\"totalElements\":0}");
        assertTrue(report.needsCoverage());
        assertTrue(report.coverageFailure().contains("metrics"));
        report.observe("metrics.history", Map.of(), true, "{\"totalPoints\":0}");
        assertFalse(report.needsCoverage());
    }

    @Test
    void scopedEmptyInventoryExplainsNoSeriesButGlobalEmptyCatalogCannotCloseTheGap() {
        var report = AgentVerifiedEvidenceReport.forRequest("cross-signal metrics", Locale.ENGLISH);
        String empty = "{\"format\":\"json_text\",\"data\":\"{\\\"code\\\":0,\\\"data\\\":{\\\"items\\\":[],\\\"truncated\\\":false}}\"}";
        report.observe("metrics.otlp_inventory", Map.of(), true, empty);
        assertTrue(report.needsCoverage());
        report.observe("metrics.otlp_inventory", Map.of("q", Map.of("entityId", 42, "start", 1000, "end", 901000)), true, empty);
        assertFalse(report.needsCoverage());
        assertTrue(report.render().contains("no metric name"));
    }

    @Test
    void nonemptyInventoryStillRequiresDataAndFailuresKeepTheirReason() {
        var report = AgentVerifiedEvidenceReport.forRequest("cross-signal metrics", Locale.ENGLISH);
        report.observe("metrics.otlp_inventory", Map.of(), true, "{\"items\":[{\"metricName\":\"observed_name\"}]}");
        assertTrue(report.needsCoverage());
        report.observe("metrics.otlp_console", Map.of(), false, null, "metric binding unavailable");
        assertTrue(report.needsCoverage());
        assertTrue(report.render().contains("metric binding unavailable"));
        assertTrue(report.requestCoverageRetry());
        assertFalse(report.requestCoverageRetry());
    }

    @Test
    void pageUnionRequiresUniqueIdsIdenticalFiltersAndStableTotals() {
        var pages = new AgentMonitorPageCoverage();
        pages.observe("a", Map.of("pageIndex", 0, "pageSize", 1, "status", "up"), page(0, 1, 2));
        pages.observe("b", Map.of("pageIndex", 1, "pageSize", 1, "status", "down"), page(1, 2, 2));
        assertFalse(pages.complete());
        pages.observe("c", Map.of("pageIndex", 1, "pageSize", 1, "status", "up"), page(1, 2, 2));
        assertTrue(pages.complete());
        assertEquals(java.util.Set.of("a", "c"), pages.coveredCalls());
        var duplicate = new AgentMonitorPageCoverage();
        duplicate.observe("a", Map.of("pageSize", 1), page(0, 1, 2));
        duplicate.observe("b", Map.of("pageSize", 1), page(1, 1, 2));
        assertFalse(duplicate.complete());
    }

    @Test
    void paginationCorrectionCanAdvanceWithProgressButCannotSpinOnAnUnchangedGap() {
        var report = AgentVerifiedEvidenceReport.forRequest("all monitors", Locale.ENGLISH);
        report.observe("monitor.query", Map.of("pageSize", 1), true, page(0, 1, 3));
        assertTrue(report.requestCoverageRetry());
        assertFalse(report.requestCoverageRetry());
        report.observe("monitor.query", Map.of("pageSize", 1, "pageIndex", 1), true, page(1, 2, 3));
        assertTrue(report.requestCoverageRetry());
        report.observe("monitor.query", Map.of("pageSize", 1, "pageIndex", 2), true, page(2, 3, 3));
        assertFalse(report.needsCoverage());
    }

    private static String page(int index, int id, int total) {
        return "{\"content\":[{\"monitorId\":" + id + "}],\"pageIndex\":" + index + ",\"pageSize\":1,\"totalElements\":" + total + "}";
    }
}
