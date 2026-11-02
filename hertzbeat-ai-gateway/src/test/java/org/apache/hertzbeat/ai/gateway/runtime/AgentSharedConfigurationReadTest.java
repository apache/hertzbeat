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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.validation.Validator;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.notice.AgentNoticeToolService;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Real Spring callbacks with isolated native services; never sends a notification. */
class AgentSharedConfigurationReadTest {
    private final org.apache.hertzbeat.alert.service.NoticeReceiverContractService receivers =
            mock(org.apache.hertzbeat.alert.service.NoticeReceiverContractService.class);
    private final org.apache.hertzbeat.manager.service.StatusPageService status =
            mock(org.apache.hertzbeat.manager.service.StatusPageService.class);
    private final org.apache.hertzbeat.manager.service.BulletinService bulletins =
            mock(org.apache.hertzbeat.manager.service.BulletinService.class);
    private final org.apache.hertzbeat.manager.service.SignalDashboardService dashboards =
            mock(org.apache.hertzbeat.manager.service.SignalDashboardService.class);
    private final org.apache.hertzbeat.manager.service.SignalSavedViewService saved =
            mock(org.apache.hertzbeat.manager.service.SignalSavedViewService.class);

    private Map<String, Object> invoke(String tool, Map<String, Object> args) {
        try (var ctx = new GenericApplicationContext()) {
            ctx.registerBean(
                    AgentNoticeToolService.class,
                    () ->
                            new AgentNoticeToolService(
                                    mock(NoticeConfigService.class),
                                    receivers,
                                    mock(Validator.class),
                                    new AlerterProperties()));
            ctx.registerBean(
                    org.apache.hertzbeat.ai.gateway.tool.status.AgentStatusPageToolService.class,
                    () ->
                            new org.apache.hertzbeat.ai.gateway.tool.status
                                    .AgentStatusPageToolService(status, mock(Validator.class)));
            ctx.registerBean(
                    org.apache.hertzbeat.ai.gateway.tool.bulletin.AgentBulletinToolService.class,
                    () ->
                            new org.apache.hertzbeat.ai.gateway.tool.bulletin
                                    .AgentBulletinToolService(bulletins));
            ctx.registerBean(
                    org.apache.hertzbeat.ai.gateway.tool.dashboard.AgentDashboardToolService.class,
                    () ->
                            new org.apache.hertzbeat.ai.gateway.tool.dashboard
                                    .AgentDashboardToolService(dashboards));
            ctx.registerBean(
                    org.apache.hertzbeat.ai.gateway.tool.savedview.AgentSavedViewToolService.class,
                    () ->
                            new org.apache.hertzbeat.ai.gateway.tool.savedview
                                    .AgentSavedViewToolService(saved));
            ctx.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(ctx.getDefaultListableBeanFactory());
            var request =
                    AgentToolExecutionRequest.builder()
                            .sessionUid("metadata-test")
                            .runId(1L)
                            .runUid("metadata-run")
                            .runSessionId(1L)
                            .actor(
                                    org.apache.hertzbeat.ai.gateway.identity.AgentActor.builder()
                                            .type("user")
                                            .id("metadata-user")
                                            .roles(List.of("admin"))
                                            .build())
                            .entryType(AgentRuntimeEntryType.USER_INPUT)
                            .approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                            .toolCallId("metadata-call")
                            .toolName(tool)
                            .arguments(args)
                            .build();
            return JsonUtil.fromJson(
                    registry.find(tool)
                            .orElseThrow()
                            .execute(
                                    new AgentToolExecutionContext(
                                            request, AgentToolCall.builder().build()))
                            .getModelContent(),
                    Map.class);
        }
    }

    private AgentReadObservationClassifier.Observation classify(
            String tool, Map<String, Object> args, Object output) {
        return new AgentReadObservationClassifier()
                .classify(
                        AgentRuntimeToolCall.builder()
                                .toolCallId("metadata")
                                .toolName(tool)
                                .arguments(args)
                                .build(),
                        JsonUtil.toJson(output));
    }

    private void setup() {
        var nativeReceiver = new org.apache.hertzbeat.common.entity.alerter.NoticeReceiver();
        nativeReceiver.setId(7L);
        nativeReceiver.setName("ai-contract-receiver");
        nativeReceiver.setType((byte) 1);
        nativeReceiver.setEmail("fixture@example.test");
        nativeReceiver.setAccessToken("fixture-not-a-real-secret");
        var receiver =
                new org.apache.hertzbeat.alert.service.NoticeReceiverContractMapper()
                        .toResponse(nativeReceiver);
        when(receivers.get(7L)).thenReturn(receiver);
        when(receivers.page(null, 0, 1))
                .thenReturn(new PageImpl<>(List.of(receiver), PageRequest.of(0, 1), 3));
        var organizationRow =
                JsonUtil.fromJson(
                        "{\"id\":1,\"name\":\"ai-org\",\"state\":1}",
                        org.apache.hertzbeat.manager.pojo.dto.StatusPageOrgInfo.class);
        var component =
                JsonUtil.fromJson(
                        "{\"id\":7,\"orgId\":1,\"name\":\"ai-component\",\"method\":0,\"configState\":0,\"state\":0}",
                        org.apache.hertzbeat.manager.pojo.dto.StatusPageComponentInfo.class);
        var incident =
                JsonUtil.fromJson(
                        "{\"id\":7,\"orgId\":1,\"name\":\"ai-incident\",\"state\":3,\"contents\":[],\"components\":[]}",
                        org.apache.hertzbeat.manager.pojo.dto.StatusPageIncidentInfo.class);
        when(status.queryStatusPageOrg()).thenReturn(organizationRow);
        when(status.queryStatusPageComponent(7L)).thenReturn(component);
        when(status.queryStatusPageComponents()).thenReturn(List.of(component));
        when(status.queryStatusPageIncident(7L)).thenReturn(incident);
        when(status.queryStatusPageIncidents(null, null, null, 0, 1))
                .thenReturn(new PageImpl<>(List.of(incident), PageRequest.of(0, 1), 3));
        var bulletin =
                org.apache.hertzbeat.common.entity.manager.Bulletin.builder()
                        .id(7L)
                        .name("ai-bulletin")
                        .app("website")
                        .monitorIds(List.of(3L))
                        .fields(Map.of())
                        .build();
        when(bulletins.getBulletinById(7L)).thenReturn(java.util.Optional.of(bulletin));
        when(bulletins.getBulletins(null, 0, 1))
                .thenReturn(new PageImpl<>(List.of(bulletin), PageRequest.of(0, 1), 3));
        when(dashboards.listSignalDashboards(anyString()))
                .thenReturn(
                        List.of(
                                org.apache.hertzbeat.common.entity.dto.SignalDashboard.builder()
                                        .dashboardKey("ai-test")
                                        .title("AI fixture")
                                        .revision(1L)
                                        .build()));
        when(saved.listSignalSavedViews(anyString(), org.mockito.ArgumentMatchers.eq("metrics")))
                .thenReturn(
                        List.of(
                                org.apache.hertzbeat.common.entity.dto.SignalSavedView.builder()
                                        .viewKey("ai-test")
                                        .label("AI fixture")
                                        .signal("metrics")
                                        .revision(1L)
                                        .route("/observability/metrics")
                                        .build()));
    }

    @Test
    void elevenRealNativeCallbacksProvideOnlyBoundedMetadataEvidence() {
        setup();
        var cases =
                Map.<String, Map<String, Object>>ofEntries(
                        Map.entry("notice.receiver_get", Map.of("id", 7)),
                        Map.entry("notice.receiver_list", Map.of("page", 0, "size", 1)),
                        Map.entry("status_page.organization.get", Map.of()),
                        Map.entry("status_page.component.get", Map.of("componentId", 7)),
                        Map.entry("status_page.component.list", Map.of("pageSize", 1)),
                        Map.entry("status_page.incident.get", Map.of("incidentId", 7)),
                        Map.entry("status_page.incident.list", Map.of("pageSize", 1)),
                        Map.entry("bulletin.get", Map.of("bulletinId", 7)),
                        Map.entry("bulletin.list", Map.of("pageSize", 1)),
                        Map.entry("dashboard.list_signal_dashboards", Map.of("limit", 1)),
                        Map.entry(
                                "saved_query.list_signal_saved_views",
                                Map.of("signal", "metrics", "limit", 1)));
        for (var entry : cases.entrySet()) {
            var output = invoke(entry.getKey(), entry.getValue());
            var proof = classify(entry.getKey(), entry.getValue(), output);
            assertNotNull(proof, entry.getKey());
            assertEquals(1, proof.count(), entry.getKey());
            var evidence = new AgentTaskEvidence();
            evidence.observe(
                    "metadata",
                    entry.getKey(),
                    AgentToolRisk.READ,
                    AgentToolStatus.SUCCEEDED,
                    entry.getValue(),
                    JsonUtil.toJson(output),
                    true);
            assertEquals(0, evidence.receiptCount());
            assertFalse(evidence.mutationAttempted());
        }
        var receiver = invoke("notice.receiver_get", Map.of("id", 7));
        assertFalse(JsonUtil.toJson(receiver).contains("fixture-not-a-real-secret"));
        assertNull(classify("notice.receiver_get", Map.of("id", 8), receiver));
        assertNull(
                classify(
                        "notice.receiver_list",
                        Map.of("page", 1, "size", 1),
                        invoke("notice.receiver_list", Map.of("page", 0, "size", 1))));
    }

    @Test
    void emptyWindowsPartialResultsWrongSignalsAndWrongTargetsAreNotOverclaimed() {
        setup();
        var empty =
                Map.<String, Object>of(
                        "items", List.of(), "offset", 0, "limit", 1, "hasMore", false, "scope",
                        "shared");
        assertEquals(
                0, classify("dashboard.list_signal_dashboards", Map.of("limit", 1), empty).count());
        var partial = new HashMap<>(invoke("status_page.incident.get", Map.of("incidentId", 7)));
        partial.put("partial", true);
        assertNull(classify("status_page.incident.get", Map.of("incidentId", 7), partial));
        var component = invoke("status_page.component.get", Map.of("componentId", 7));
        assertNull(classify("status_page.component.get", Map.of("componentId", 8), component));
        var views =
                invoke(
                        "saved_query.list_signal_saved_views",
                        Map.of("signal", "metrics", "limit", 1));
        assertNull(
                classify(
                        "saved_query.list_signal_saved_views",
                        Map.of("signal", "logs", "limit", 1),
                        views));
        assertNull(classify("notice.receiver_get", Map.of("id", 7), Map.of("success", true)));
    }
}
