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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.apache.hertzbeat.ai.gateway.tool.bulletin.AgentBulletinMetricsToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorInvestigationToolService;
import org.apache.hertzbeat.ai.gateway.tool.status.AgentStatusHistoryToolService;
import org.apache.hertzbeat.ai.gateway.tool.status.AgentStatusPageToolService;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.manager.service.AppService;
import jakarta.validation.Validator;
import org.apache.hertzbeat.ai.gateway.tool.system.AgentTelemetrySourceToolService;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.controller.TelemetrySourceController;
import org.apache.hertzbeat.alert.dto.AlertGroupEvidence;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.CatalogResponse;
import org.apache.hertzbeat.alert.integration.service.AlertIntegrationCatalogService;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.alert.service.AlertGroupEvidenceService;
import org.apache.hertzbeat.alert.service.AlertInvestigationReadModelService;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.StatusPageService;
import org.apache.hertzbeat.manager.service.entity.MonitorInvestigationReadModelService;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;

class AgentReadOnlyCoverageToolTest {
    @AfterEach
    void clearWorkspace() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void investigationUsesWorkspaceAndAdmission() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        var nativeService = mock(AlertInvestigationReadModelService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        when(admission.execute(eq("topology"), any())).thenAnswer(call -> ((Supplier<?>) call.getArgument(1)).get());
        var tool = new AgentAlertInvestigationToolService(nativeService, mock(AlertGroupEvidenceService.class), mock(AlertService.class), admission);
        tool.investigate(3L, 1000L, 2000L);
        verify(nativeService).query("team-a", 3L, 1000L, 2000L);
        verify(admission).execute(eq("topology"), any());
        assertThrows(IllegalArgumentException.class, () -> tool.investigate(3L, 1L, 86400002L));
    }

    @Test
    void invalidInvestigationAndAdmissionFailureNeverRead() {
        var nativeService = mock(AlertInvestigationReadModelService.class);
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var tool = new AgentAlertInvestigationToolService(nativeService, mock(AlertGroupEvidenceService.class), mock(AlertService.class), admission);
        assertThrows(IllegalArgumentException.class, () -> tool.investigate(3L, 1L, 2L));
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        when(admission.execute(eq("topology"), any())).thenThrow(new IllegalStateException("busy"));
        assertThrows(IllegalStateException.class, () -> tool.investigate(3L, 1L, 2L));
        verifyNoInteractions(nativeService);
    }

    @Test
    void groupEvidenceIsBoundedAndScoped() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        var evidence = mock(AlertGroupEvidenceService.class);
        when(evidence.getEvidence("team-a", List.of("3"))).thenReturn(new AlertGroupEvidence(List.of(), List.of(3L), 1L));
        var tool = new AgentAlertInvestigationToolService(mock(AlertInvestigationReadModelService.class), evidence, mock(AlertService.class), mock(ObservabilityQueryAdmissionService.class));
        tool.evidence(List.of(3L));
        verify(evidence).getEvidence("team-a", List.of("3"));
        assertThrows(IllegalArgumentException.class, () -> tool.evidence(List.of(-1L)));
        assertThrows(IllegalArgumentException.class, () -> tool.evidence(java.util.Collections.nCopies(101, 3L)));
    }

    @Test
    void groupQueryPreservesCorrelationFilters() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        var alerts = mock(AlertService.class);
        when(alerts.getGroupAlerts("team-a", "firing", "failure", "critical", "checkout", "payments", "prod", "gmtUpdate", "desc", 0, 20)).thenReturn(Page.empty());
        var tool = new AgentAlertInvestigationToolService(mock(AlertInvestigationReadModelService.class), mock(AlertGroupEvidenceService.class),
                alerts, mock(ObservabilityQueryAdmissionService.class));
        tool.groups("firing", "failure", "critical", "checkout", "payments", "prod", null, null);
        verify(alerts).getGroupAlerts("team-a", "firing", "failure", "critical", "checkout", "payments", "prod", "gmtUpdate", "desc", 0, 20);
        assertThrows(IllegalArgumentException.class, () -> tool.groups(null, null, null, null, null, null, 0, 51));
    }

    @Test
    void savedRulePreviewUsesNativePipelineAndRedacts() throws Exception {
        var rules = mock(AlertDefineService.class);
        var tool = new AgentAlertRuleReadToolService(rules, mock(DataSourceService.class));
        AlertDefine rule = new AlertDefine();
        rule.setType("periodic_log");
        rule.setDatasource("sql");
        rule.setExpr("saved query");
        when(rules.getAlertDefine(3L)).thenReturn(rule);
        when(rules.getDefinePreview("sql", "periodic_log", "saved query")).thenReturn(List.of(Map.of("password", "never-return-this")));
        Map<String, Object> output = tool.preview(3L);
        verify(rules).getDefinePreview("sql", "periodic_log", "saved query");
        assertEquals(false, output.toString().contains("never-return-this"));
        assertEquals(AgentToolAccess.ADMIN, AgentAlertRuleReadToolService.class.getMethod("preview", Long.class).getAnnotation(AgentToolPolicy.class).access());
        assertEquals(AgentToolAccess.USER, AgentAlertRuleReadToolService.class.getMethod("datasourceStatus").getAnnotation(AgentToolPolicy.class).access());
    }

    @Test
    void unsupportedPreviewNeverQueries() {
        var rules = mock(AlertDefineService.class);
        var tool = new AgentAlertRuleReadToolService(rules, mock(DataSourceService.class));
        assertThrows(IllegalArgumentException.class, () -> tool.preview(-1L));
        verifyNoInteractions(rules);
    }

    @Test
    void statusHistoryBoundsQueryBeforeLoading() {
        var service = mock(StatusPageService.class);
        var tool = new AgentStatusHistoryToolService(service);
        assertThrows(IllegalArgumentException.class, () -> tool.history(3L, 366));
        verifyNoInteractions(service);
        tool.history(3L, null);
        verify(service).queryComponentStatus(3L, 7);
    }

    @Test
    void bulletinUnavailableIsHonestAndDoesNotQuery() {
        var service = mock(BulletinService.class);
        var reader = mock(RealTimeDataReader.class);
        var tool = new AgentBulletinMetricsToolService(service, reader);
        assertEquals(false, tool.metrics(3L).get("available"));
        assertEquals(true, tool.metrics(3L).get("partial"));
        verifyNoInteractions(service);
    }

    @Test
    void monitorInvestigationUsesExactPersistedMonitor() {
        var monitors = mock(MonitorService.class);
        var investigation = mock(MonitorInvestigationReadModelService.class);
        var tool = new AgentMonitorInvestigationToolService(monitors, investigation);
        assertThrows(IllegalArgumentException.class, () -> tool.investigate(3L, 1L, 86400002L));
        verifyNoInteractions(monitors, investigation);
        Monitor monitor = new Monitor();
        when(monitors.getMonitor(3L)).thenReturn(monitor);
        tool.investigate(3L, 1000L, 2000L);
        verify(investigation).query(monitor, 1000L, 2000L);
    }

    @Test
    void integrationCatalogUsesWorkspaceAndRejectsArbitraryPaths() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        var service = mock(AlertIntegrationCatalogService.class);
        when(service.catalog("team-a")).thenReturn(new CatalogResponse(List.of()));
        var tool = new AgentAlertIntegrationReadToolService(service);
        tool.catalog();
        verify(service).catalog("team-a");
        assertThrows(IllegalArgumentException.class, () -> tool.guide("https://untrusted"));
    }

    @Test
    void ruleListPassesIdsAndSortToNativePagination() {
        var rules = mock(AlertDefineService.class);
        var tool = new AgentAlertRuleToolService(rules, mock(AppService.class), mock(Validator.class));
        when(rules.getAlertDefines(List.of(3L), List.of("cpu"), "linux", true, "id", "asc", 0, 10)).thenReturn(Page.empty());
        tool.listAlertRules("cpu", "linux", true, 0, 10, List.of(3L), "id", "asc");
        verify(rules).getAlertDefines(List.of(3L), List.of("cpu"), "linux", true, "id", "asc", 0, 10);
        assertThrows(IllegalArgumentException.class, () -> tool.listAlertRules(null, null, null, 0, 10, List.of(-1L), "id", "asc"));
    }

    @Test
    void incidentTimeFilterUsesNativePagination() {
        var service = mock(StatusPageService.class);
        var tool = new AgentStatusPageToolService(service, mock(Validator.class));
        when(service.queryStatusPageIncidents("failure", 1000L, 2000L, 0, 20)).thenReturn(Page.empty());
        tool.incidents("failure", 0, 20, 1000L, 2000L);
        verify(service).queryStatusPageIncidents("failure", 1000L, 2000L, 0, 20);
        assertThrows(IllegalArgumentException.class, () -> tool.incidents(null, 0, 20, 1000L, null));
    }

    @Test
    void integrationVerificationIsChangeWithNativeUserAccess() throws Exception {
        AuthTokenRequestContext.bindWorkspaceId("team-a");
        var service = mock(AlertIntegrationCatalogService.class);
        var tool = new AgentAlertIntegrationReadToolService(service);
        tool.startVerification("webhook");
        verify(service).startVerification("team-a", "webhook");
        AgentToolPolicy policy = AgentAlertIntegrationReadToolService.class.getMethod("startVerification", String.class).getAnnotation(AgentToolPolicy.class);
        assertEquals(AgentToolRisk.CHANGE, policy.risk());
        assertEquals(AgentToolAccess.USER, policy.access());
    }

    @Test
    void telemetryNeverUpgradesMissingNativeAuthorizationFromDefaultWorkspace() {
        var source = mock(TelemetrySourceController.class);
        when(source.sources()).thenReturn(Message.success(Map.of("external", Map.of("accessible", true),
                "self", Map.of("accessible", false, "workspaceId", ""))));
        var tool = new AgentTelemetrySourceToolService(source);
        var request = AgentToolExecutionRequest.builder()
                .sessionUid("s").runId(1L).runUid("r").runSessionId(1L).workspaceId("default")
                .actor(AgentActor.builder().type("user").id("alice").roles(List.of("admin")).build())
                .entryType(AgentRuntimeEntryType.USER_INPUT).approvalHandling(AgentApprovalHandling.WAIT_FOR_DECISION)
                .toolName("telemetry.sources").toolCallId("call").arguments(Map.of()).build();
        Map<String, Object> output = AgentToolContextSupport.withInvocation(new AgentToolExecutionContext(request,
                AgentToolCall.builder().toolCallId("call").build()), tool::sources);
        assertEquals(true, output.get("partial"));
        Map<?, ?> data = (Map<?, ?>) output.get("data");
        assertEquals(false, ((Map<?, ?>) data.get("self")).get("accessible"));
    }

}
