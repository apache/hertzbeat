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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.manager.Label;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.AppService;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

class AgentBusinessMetadataReadTest {
    private AgentRuntimeToolCall call(String tool, Map<String, Object> args) {
        return AgentRuntimeToolCall.builder()
                .toolCallId("business-read")
                .toolName(tool)
                .arguments(args)
                .build();
    }

    private AgentReadObservationClassifier.Observation classify(
            String tool, Map<String, Object> args, Object value) {
        return new AgentReadObservationClassifier()
                .classify(call(tool, args), JsonUtil.toJson(value));
    }

    private Map<String, Object> rule(long id) {
        return Map.of(
                "ruleId",
                id,
                "name",
                "ai-e2e-rule",
                "type",
                "realtime_metric",
                "expression",
                "value > 90",
                "enabled",
                false);
    }

    private Map<String, Object> page(List<?> rows, int page, int size, long total) {
        return Map.of(
                "content",
                rows,
                "pageIndex",
                page,
                "pageSize",
                size,
                "totalElements",
                total,
                "totalPages",
                total == 0 ? 0 : (total + size - 1) / size);
    }

    @Test
    void nativeAlertRuleDetailIsAnObservationAndNeverMutationReceipt() {
        var nativeService = mock(AlertDefineService.class);
        when(nativeService.getAlertDefine(42L))
                .thenReturn(
                        AlertDefine.builder()
                                .id(42L)
                                .name("ai-e2e-rule")
                                .type("realtime_metric")
                                .expr("value > 90")
                                .enable(false)
                                .build());
        var tool =
                new AgentAlertRuleToolService(
                        nativeService,
                        mock(AppService.class),
                        mock(jakarta.validation.Validator.class));
        var output = tool.getAlertRule(42L);
        var args = Map.<String, Object>of("ruleId", 42L);
        assertNotNull(classify("alert_rule.get", args, output));
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "read",
                "alert_rule.get",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(output),
                true);
        assertTrue(evidence.hasObservation());
        assertEquals(0, evidence.receiptCount());
        assertFalse(evidence.mutationAttempted());
        assertNull(classify("alert_rule.get", Map.of("ruleId", 43), output));
    }

    @Test
    void alertPageProvesReturnedRowsOnlyAndEnforcesRequestedPaginationAndIds() {
        var output = page(List.of(rule(42)), 0, 1, 20);
        var result = classify("alert_rule.list", Map.of("pageSize", 1), output);
        assertNotNull(result);
        assertEquals(1, result.count());
        assertNull(classify("alert_rule.list", Map.of("pageSize", 2), output));
        assertNull(classify("alert_rule.list", Map.of("pageSize", 1, "ids", List.of(43)), output));
        assertNull(
                classify(
                        "alert_rule.list",
                        Map.of("pageSize", 1),
                        page(List.of(rule(42)), 0, 1, 0)));
    }

    @Test
    void exactEmptyPageIsValidNegativeRead() {
        var result = classify("alert_rule.list", Map.of(), page(List.of(), 0, 10, 0));
        assertNotNull(result);
        assertEquals(0, result.count());
    }

    @Test
    void labelRequiresUntruncatedNativeProjectionAndMatchingIdentity() {
        var value =
                Label.builder().id(4L).name("ai-e2e-label").tagValue("test").type((byte) 1).build();
        var projection = AgentManagementOutputSupport.view(value);
        assertNotNull(classify("label.get", Map.of("labelId", 4L), projection));
        assertNull(classify("label.get", Map.of("labelId", 5L), projection));
        var partial = new HashMap<>(projection);
        partial.put("partial", true);
        assertNull(classify("label.get", Map.of("labelId", 4L), partial));
    }

    @Test
    void duplicateOrFractionalIdentitiesCannotBecomeEvidence() {
        assertNull(
                classify(
                        "alert_rule.list",
                        Map.of("pageSize", 2),
                        page(List.of(rule(42), rule(42)), 0, 2, 2)));
        var bad = new HashMap<>(rule(42));
        bad.put("ruleId", 42.5);
        assertNull(classify("alert_rule.get", Map.of("ruleId", 42), bad));
    }

    @Test
    void unknownOrMutationToolNeverAcquiresReadContract() {
        assertNull(classify("alert_rule.update", Map.of("ruleId", 42), rule(42)));
        assertNull(classify("notice.rule_get", Map.of("id", 42), rule(42)));
    }

    @Test
    void nativeHelperReadsUseExactSourceShapesWithoutProvingExternalHealth() {
        var labels =
                Map.of(
                        "language",
                        "en-US",
                        "offset",
                        0,
                        "limit",
                        1,
                        "total",
                        2,
                        "hasMore",
                        true,
                        "partial",
                        false,
                        "items",
                        List.of(Map.of("key", "a", "value", "Alpha")));
        assertNotNull(
                classify(
                        "platform.i18n_resources",
                        Map.of("language", "en-US", "offset", 0, "limit", 1),
                        labels));
        assertNull(
                classify(
                        "platform.i18n_resources",
                        Map.of("language", "zh-CN", "offset", 0, "limit", 1),
                        labels));
        var binding =
                Map.of(
                        "monitorId",
                        3,
                        "found",
                        true,
                        "uid",
                        "local",
                        "version",
                        2,
                        "enabled",
                        true);
        assertNotNull(classify("grafana.dashboard_get", Map.of("monitorId", 3), binding));
        assertNull(classify("grafana.dashboard_get", Map.of("monitorId", 4), binding));
        assertEquals(
                0,
                classify(
                                "grafana.dashboard_get",
                                Map.of("monitorId", 3),
                                Map.of("monitorId", 3, "found", false))
                        .count());
    }

    @Test
    void actionCatalogReadRejectsExecutableOrTruncatedDocuments() {
        var row =
                Map.of(
                        "catalogId",
                        "doc",
                        "name",
                        "Documentation",
                        "risk",
                        "high",
                        "executionAllowed",
                        false,
                        "executionMode",
                        "manual-approval-draft-only",
                        "workspaceId",
                        "scope");
        var projected = AgentManagementOutputSupport.view(List.of(row));
        assertNotNull(classify("action_catalog.list", Map.of("limit", 10), projected));
        var executable = new HashMap<String, Object>(row);
        executable.put("executionAllowed", true);
        assertNull(
                classify(
                        "action_catalog.list",
                        Map.of("limit", 10),
                        AgentManagementOutputSupport.view(List.of(executable))));
    }

    @Test
    void importShapePreviewRemainsValidationWithoutReadOrMutationProof() {
        String content = "[{\"monitor\":{\"name\":\"test\",\"app\":\"website\"}}]";
        var output =
                Map.of(
                        "format",
                        "native-json",
                        "count",
                        1,
                        "names",
                        List.of("test"),
                        "persisted",
                        false,
                        "nativeDomainValidationPending",
                        true,
                        "previewHash",
                        org.apache.hertzbeat.ai.gateway.text.GatewayText.sha256(content));
        var evidence = new AgentTaskEvidence();
        evidence.observe(
                "preview",
                "monitor.import_preview_json",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                Map.of("content", content),
                JsonUtil.toJson(output),
                true);
        assertFalse(evidence.hasObservation());
        assertEquals(0, evidence.receiptCount());
        assertFalse(evidence.mutationAttempted());
        assertEquals(AgentTaskEvidence.Kind.VALIDATION, evidence.facts().getFirst().kind());
    }

    @Test
    void quantitativeReadClaimsUseExactNestedScalarPathsWithoutInventingFacts() {
        var evidence = new AgentTaskEvidence();
        var output = rule(42);
        var args = Map.<String, Object>of("ruleId", 42);
        evidence.observe(
                "read",
                "alert_rule.get",
                AgentToolRisk.READ,
                AgentToolStatus.SUCCEEDED,
                args,
                JsonUtil.toJson(output),
                true);
        assertTrue(
                evidence.claimsMatch(
                        List.of(new AgentTaskAssessment.Claim("read/result/ruleId", "42"))));
        assertFalse(
                evidence.claimsMatch(
                        List.of(new AgentTaskAssessment.Claim("read/result/ruleId", "43"))));
        assertFalse(
                evidence.claimsMatch(
                        List.of(new AgentTaskAssessment.Claim("missing/result/ruleId", "42"))));
        assertFalse(
                evidence.claimsMatch(
                        List.of(new AgentTaskAssessment.Claim("read/result/approved", "true"))));
        assertEquals(0, evidence.receiptCount());
    }

    @Test
    void nestedScalarClaimsRejectContainerCoercionInvalidPathsAndOutOfBounds() {
        var values = Map.<String, Object>of("result", Map.of("a/b", List.of(Map.of("x~y", 7))));
        assertTrue(AgentScalarClaimPath.matches(values, "result/a~1b/0/x~0y", "7"));
        for (String path :
                List.of(
                        "result/a~1b/00/x~0y",
                        "result/a~1b/-1/x~0y",
                        "result/a~1b/1/x~0y",
                        "result/a~2b/0/x~0y",
                        "result/a~1b",
                        "result/" + "x".repeat(513))) {
            assertFalse(AgentScalarClaimPath.matches(values, path, "7"));
        }
    }

    @Test
    void nativePromqlEvidenceBindsQueryArgumentsAndEveryReturnedTimestamp() {
        var query =
                Map.<String, Object>of(
                        "refId",
                        "A",
                        "datasource",
                        "native-promql",
                        "expression",
                        "up",
                        "start",
                        1700000000000L,
                        "end",
                        1700000060000L,
                        "stepSeconds",
                        60,
                        "limit",
                        5);
        var args = Map.<String, Object>of("queries", List.of(query));
        var frame =
                Map.of(
                        "schema",
                        Map.of("fields", List.of(Map.of("type", "time"), Map.of("type", "number"))),
                        "data",
                        List.of(List.of(1700000000000L, "2.5")));
        var data = new HashMap<String, Object>();
        data.put("queryVersion", "native-warehouse-query.v1");
        data.put(
                "inputHash",
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                        .normalizedArgumentsHash(args));
        data.put("nativeScope", "shared-warehouse");
        data.put("queryCount", 1);
        data.put("failedQueries", 0);
        data.put("partial", false);
        data.put("data", List.of(Map.of("refId", "A", "status", 200, "frames", List.of(frame))));
        assertEquals(1, classify("metrics.query_native", args, data).count());
        var changed = new HashMap<>(query);
        changed.put("expression", "different");
        assertNull(classify("metrics.query_native", Map.of("queries", List.of(changed)), data));
        data.put("failedQueries", 1);
        assertNull(classify("metrics.query_native", args, data));
        data.put("failedQueries", 0);
        data.put(
                "data",
                List.of(
                        Map.of(
                                "refId",
                                "A",
                                "status",
                                200,
                                "frames",
                                List.of(
                                        Map.of(
                                                "schema",
                                                frame.get("schema"),
                                                "data",
                                                List.of(List.of(1700000060001L, 2)))))));
        assertNull(classify("metrics.query_native", args, data));
    }
}
