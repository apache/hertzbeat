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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorWorkspaceToolService;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.Hierarchy;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricHistoryDock;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayout;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutItem;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MetricsFavoriteService;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;

class AgentApplicationCatalogReadTest {
    private AgentRuntimeToolCall call(String name, Map<String, Object> args) {
        return AgentRuntimeToolCall.builder()
                .toolCallId("catalog")
                .toolName(name)
                .arguments(args)
                .build();
    }

    private AgentReadObservationClassifier.Observation classify(
            String name, Map<String, Object> args, Object data) {
        return new AgentReadObservationClassifier()
                .classify(call(name, args), JsonUtil.toJson(data));
    }

    private String callback(Object service, String method, Class<?>[] signature, String args)
            throws Exception {
        var m = service.getClass().getMethod(method, signature);
        return org.springframework.ai.tool.method.MethodToolCallback.builder()
                .toolObject(service)
                .toolMethod(m)
                .toolDefinition(org.springframework.ai.tool.support.ToolDefinitions.from(m))
                .build()
                .call(args);
    }

    private Hierarchy root(String app) {
        var field = new Hierarchy();
        field.setValue("usage");
        field.setIsLeaf(true);
        field.setType((byte) 0);
        var metric = new Hierarchy();
        metric.setValue("cpu");
        metric.setChildren(List.of(field));
        var root = new Hierarchy();
        root.setValue(app);
        root.setCategory("custom");
        root.setHide(false);
        root.setChildren(List.of(metric));
        return root;
    }

    private MonitorMetricLayout layout(String app) {
        return new MonitorMetricLayout(
                app,
                "12345678-1234-1234-1234-123456789abc",
                1,
                "custom",
                12,
                List.of(new MonitorMetricLayoutItem("cpu", 0, 0, 12, 8, false, 0)),
                new MonitorMetricHistoryDock(false, 12));
    }

    private <T> T as(String type, Supplier<T> value) {
        var req =
                AgentToolExecutionRequest.builder()
                        .sessionUid("session")
                        .runId(1L)
                        .runUid("run")
                        .runSessionId(1L)
                        .workspaceId("workspace")
                        .entryType(AgentRuntimeEntryType.USER_INPUT)
                        .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                        .toolName("read-fixture")
                        .toolCallId("read-call")
                        .arguments(Map.of())
                        .actor(
                                AgentActor.builder()
                                        .type(type)
                                        .id("alice")
                                        .roles(List.of("user"))
                                        .build())
                        .build();
        return AgentToolContextSupport.withInvocation(
                new AgentToolExecutionContext(req, new AgentToolCall()), value);
    }

    @Test
    void bothNativeHierarchyCallbacksBindCanonicalApplicationAndLanguage() throws Exception {
        var apps = mock(AppService.class);
        var rules = mock(AlertDefineService.class);
        when(apps.getAppHierarchy("website", "en-US")).thenReturn(List.of(root("website")));
        var metrics =
                new AgentMetricsToolService(
                        apps, mock(MonitorService.class), mock(MetricsDataService.class));
        var result =
                callback(
                        metrics,
                        "metricsRelated",
                        new Class<?>[] {String.class, String.class},
                        "{\"app\":\" WEBSITE \"}");
        var observation =
                new AgentReadObservationClassifier()
                        .classify(call("metrics.related", Map.of("app", " WEBSITE ")), result);
        assertNotNull(observation);
        assertEquals(1, observation.count());
        var alert = new AgentAlertRuleToolService(rules, apps, mock(Validator.class));
        result =
                callback(
                        alert,
                        "readAlertRuleHierarchy",
                        new Class<?>[] {String.class},
                        "{\"app\":\"website\"}");
        assertNotNull(
                new AgentReadObservationClassifier()
                        .classify(call("alert_rule.hierarchy", Map.of("app", "website")), result));
        verifyNoInteractions(rules);
    }

    @Test
    void allHierarchyMetadataIsNotMeasurementAndNeverCrossesSingleAppScope() {
        var apps = mock(AppService.class);
        when(apps.getAllAppHierarchy("en-US")).thenReturn(List.of(root("website"), root("linux")));
        var svc =
                new AgentMetricsToolService(
                        apps, mock(MonitorService.class), mock(MetricsDataService.class));
        var data = svc.metricsRelated(null, null);
        var observation = classify("metrics.related", Map.of(), data);
        assertNotNull(observation);
        assertEquals(2, observation.count());
        assertEquals("app-metric-field-metadata-not-health", observation.kind());
        assertNull(classify("metrics.related", Map.of("app", "website"), data));
        assertNull(classify("metrics.related", Map.of("query", "SELECT 1"), data));
        verify(apps).getAllAppHierarchy("en-US");
        verifyNoMoreInteractions(apps);
    }

    @Test
    void malformedDuplicateAndTruncatedHierarchyAreNotCompleteEvidence() {
        var apps = mock(AppService.class);
        var svc =
                new AgentMetricsToolService(
                        apps, mock(MonitorService.class), mock(MetricsDataService.class));
        when(apps.getAllAppHierarchy("en-US"))
                .thenReturn(List.of(root("website"), root("website")));
        assertNull(classify("metrics.related", Map.of(), svc.metricsRelated(null, null)));
        var broken = root("website");
        broken.getChildren().getFirst().getChildren().getFirst().setType((byte) 9);
        when(apps.getAppHierarchy("website", "en-US")).thenReturn(List.of(broken));
        assertNull(
                classify(
                        "metrics.related",
                        Map.of("app", "website"),
                        svc.metricsRelated("website", null)));
        var many = java.util.stream.IntStream.range(0, 101).mapToObj(i -> root("app" + i)).toList();
        when(apps.getAllAppHierarchy("en-US")).thenReturn(many);
        assertNull(classify("metrics.related", Map.of(), svc.metricsRelated(null, null)));
    }

    @Test
    void favoritesAndLayoutReadFromOnlyTheTrustedCurrentUser() throws Exception {
        var favorites = mock(MetricsFavoriteService.class);
        var layouts = mock(MonitorMetricLayoutService.class);
        when(favorites.getUserFavoritedMetrics("alice", 7L)).thenReturn(Set.of("cpu"));
        when(layouts.get("alice", "website")).thenReturn(Optional.of(layout("website")));
        var svc = new AgentMonitorWorkspaceToolService(favorites, layouts);
        String response =
                as(
                        "user",
                        () -> {
                            try {
                                return callback(
                                        svc,
                                        "favoriteRead",
                                        new Class<?>[] {Long.class},
                                        "{\"monitorId\":7}");
                            } catch (Exception e) {
                                throw new RuntimeException(e);
                            }
                        });
        var observation =
                new AgentReadObservationClassifier()
                        .classify(call("monitor.favorite_list", Map.of("monitorId", 7)), response);
        assertNotNull(observation);
        assertEquals(1, observation.count());
        var data = as("user", () -> svc.layoutRead(" WEBSITE "));
        assertNotNull(classify("monitor.layout_get", Map.of("application", " WEBSITE "), data));
        assertNull(classify("monitor.layout_get", Map.of("application", "linux"), data));
        assertNull(
                new AgentReadObservationClassifier()
                        .classify(call("monitor.favorite_list", Map.of("monitorId", 8)), response));
        verify(favorites).getUserFavoritedMetrics("alice", 7L);
        verifyNoMoreInteractions(favorites);
        verify(layouts).get("alice", "website");
        verifyNoMoreInteractions(layouts);
    }

    @Test
    void explicitEmptyPersonalReadsAreZeroRowsRatherThanFailures() {
        var favorites = mock(MetricsFavoriteService.class);
        var layouts = mock(MonitorMetricLayoutService.class);
        when(favorites.getUserFavoritedMetrics("alice", 7L)).thenReturn(Set.of());
        when(layouts.get("alice", "website")).thenReturn(Optional.empty());
        var svc = new AgentMonitorWorkspaceToolService(favorites, layouts);
        assertEquals(
                0,
                classify(
                                "monitor.favorite_list",
                                Map.of("monitorId", 7),
                                as("user", () -> svc.favoriteRead(7L)))
                        .count());
        assertEquals(
                0,
                classify(
                                "monitor.layout_get",
                                Map.of("application", "website"),
                                as("user", () -> svc.layoutRead("website")))
                        .count());
    }

    @Test
    void missingIdentityOrInvalidScopesNeverCallsNativeServices() {
        var favorites = mock(MetricsFavoriteService.class);
        var layouts = mock(MonitorMetricLayoutService.class);
        var apps = mock(AppService.class);
        var svc = new AgentMonitorWorkspaceToolService(favorites, layouts);
        assertThrows(
                IllegalArgumentException.class, () -> as("system", () -> svc.favoriteRead(7L)));
        assertThrows(
                IllegalArgumentException.class,
                () -> as("system", () -> svc.layoutRead("website")));
        assertThrows(IllegalArgumentException.class, () -> as("user", () -> svc.favoriteRead(-1L)));
        var metrics =
                new AgentMetricsToolService(
                        apps, mock(MonitorService.class), mock(MetricsDataService.class));
        assertThrows(
                IllegalArgumentException.class,
                () -> metrics.metricsRelated("https://invalid.example", null));
        assertThrows(
                IllegalArgumentException.class,
                () -> metrics.metricsRelated("website", "en-US/../../"));
        verifyNoInteractions(favorites, layouts, apps);
    }

    @Test
    void personalMetadataFailuresAndMalformedLayoutsCannotBecomeGenericSuccess() {
        var favorites = mock(MetricsFavoriteService.class);
        var layouts = mock(MonitorMetricLayoutService.class);
        var svc = new AgentMonitorWorkspaceToolService(favorites, layouts);
        var bad =
                new MonitorMetricLayout(
                        "website",
                        "bad",
                        1,
                        "custom",
                        12,
                        List.of(),
                        new MonitorMetricHistoryDock(false, 12));
        when(layouts.get("alice", "website")).thenReturn(Optional.of(bad));
        assertNull(
                classify(
                        "monitor.layout_get",
                        Map.of("application", "website"),
                        as("user", () -> svc.layoutRead("website"))));
        when(layouts.get("alice", "website"))
                .thenReturn(
                        Optional.of(
                                new MonitorMetricLayout(
                                        "website",
                                        layout("website").revision(),
                                        1,
                                        "custom",
                                        12,
                                        List.of(
                                                new MonitorMetricLayoutItem(
                                                        "cpu", 0, 0, 12, 8, false, 0),
                                                new MonitorMetricLayoutItem(
                                                        "memory", 0, 0, 12, 8, false, 1)),
                                        new MonitorMetricHistoryDock(false, 12))));
        assertNull(
                classify(
                        "monitor.layout_get",
                        Map.of("application", "website"),
                        as("user", () -> svc.layoutRead("website"))));
        assertNull(
                classify(
                        "monitor.layout_get",
                        Map.of("application", "website"),
                        Map.of("success", true)));
        when(favorites.getUserFavoritedMetrics("alice", 7L))
                .thenReturn(
                        new java.util.HashSet<>(
                                java.util.stream.IntStream.range(0, 101)
                                        .mapToObj(i -> "metric" + i)
                                        .toList()));
        assertNull(
                classify(
                        "monitor.favorite_list",
                        Map.of("monitorId", 7),
                        as("user", () -> svc.favoriteRead(7L))));
    }
}
