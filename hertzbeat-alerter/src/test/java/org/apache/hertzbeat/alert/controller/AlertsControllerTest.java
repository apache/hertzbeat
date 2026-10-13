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

package org.apache.hertzbeat.alert.controller;

import static org.hamcrest.Matchers.aMapWithSize;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.LongStream;
import org.apache.hertzbeat.alert.dto.AlertGroupEvidence;
import org.apache.hertzbeat.alert.dto.AlertGroupStatusEvidence;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.alert.service.AlertGroupEvidenceRequestException;
import org.apache.hertzbeat.alert.service.AlertGroupEvidenceService;
import org.apache.hertzbeat.alert.service.AlertGroupNotFoundException;
import org.apache.hertzbeat.alert.service.AlertGroupStatusNotSupportedException;
import org.apache.hertzbeat.alert.service.AlertInvestigationReadModelService;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.observability.dto.investigation.AlertInvestigationView;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationReason;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;

/**
 * Test case for {@link AlertsController}
 */
@ExtendWith(MockitoExtension.class)
class AlertsControllerTest {
    private static final String WORKSPACE_ID = AuthTokenScopes.DEFAULT_WORKSPACE_ID;

    private MockMvc mockMvc;

    @InjectMocks
    private AlertsController alertsController;

    @InjectMocks
    private AlertSummaryController alertSummaryController;

    @Mock
    private AlertService alertService;

    @Mock
    private AlertGroupEvidenceService alertGroupEvidenceService;

    @Mock
    private AlertInvestigationReadModelService alertInvestigationReadModelService;

    @Mock
    private ObservabilityQueryAdmissionService queryAdmissionService;

    private List<Long> ids;


    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindWorkspaceId(WORKSPACE_ID);
        this.mockMvc = MockMvcBuilders.standaloneSetup(alertsController, alertSummaryController).build();
        ids = LongStream.rangeClosed(1, 10).boxed().collect(Collectors.toList());
    }

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void getAlerts() throws Exception {
        String sortField = "id";
        String orderType = "desc";
        String status = "firing";
        String content = "test";
        String severity = "critical";
        String serviceName = "checkout";
        String serviceNamespace = "payments";
        String environment = "prod";
        int pageIndex = 0;
        int pageSize = 10;

        Page<GroupAlert> alertPage = new PageImpl<>(
                Collections.singletonList(GroupAlert.builder().build()),
                PageRequest.of(pageIndex, pageSize, Sort.by(sortField).descending()),
                ids.size()
        );
        Mockito.when(alertService.getGroupAlerts(WORKSPACE_ID, status, content, severity, serviceName,
                        serviceNamespace, environment, sortField, orderType, pageIndex, pageSize))
                .thenReturn(alertPage);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/alerts/group")
                        .param("status", status)
                        .param("search", content)
                        .param("severity", severity)
                        .param("serviceName", serviceName)
                        .param("serviceNamespace", serviceNamespace)
                        .param("environment", environment)
                        .param("sort", sortField)
                        .param("order", orderType)
                        .param("pageIndex", String.valueOf(pageIndex))
                        .param("pageSize", String.valueOf(pageSize))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(10))
                .andExpect(jsonPath("$.data.pageIndex").value(0))
                .andExpect(jsonPath("$.data.pageSize").value(10))
                .andExpect(jsonPath("$.data", aMapWithSize(4)))
                .andExpect(jsonPath("$.data.pageable").doesNotExist())
                .andExpect(jsonPath("$.data.sort").doesNotExist())
                .andExpect(jsonPath("$.data.number").doesNotExist())
                .andExpect(jsonPath("$.data.size").doesNotExist())
                .andReturn();
    }

    @Test
    void alertInvestigationUsesTrustedWorkspaceOneAdmissionAndExactWindow() throws Exception {
        long start = 1_787_934_874_000L;
        long end = start + 60_000L;
        AlertInvestigationView view = investigation(start, end);
        Mockito.when(queryAdmissionService.execute(Mockito.eq("topology"), Mockito.any()))
                .thenAnswer(invocation -> ((Supplier<?>) invocation.getArgument(1)).get());
        Mockito.when(alertInvestigationReadModelService.query(WORKSPACE_ID, 7L, start, end)).thenReturn(view);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/7/investigation")
                        .param("start", Long.toString(start))
                        .param("end", Long.toString(end)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.alertId").value(7))
                .andExpect(jsonPath("$.data.window.anchor").value(start + 1L))
                .andExpect(jsonPath("$.data.logs.source").value("greptime_logs"));

        Mockito.verify(queryAdmissionService, Mockito.times(1))
                .execute(Mockito.eq("topology"), Mockito.any());
        Mockito.verify(alertInvestigationReadModelService).query(WORKSPACE_ID, 7L, start, end);
    }

    @Test
    void invalidAlertInvestigationSelectionFailsBeforeAdmission() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/0/investigation")
                        .param("start", "100")
                        .param("end", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE));

        Mockito.verify(queryAdmissionService, Mockito.never()).execute(Mockito.anyString(), Mockito.any());
        Mockito.verify(alertInvestigationReadModelService, Mockito.never())
                .query(Mockito.anyString(), Mockito.anyLong(), Mockito.anyLong(), Mockito.anyLong());
    }

    private AlertInvestigationView investigation(long start, long end) {
        return new AlertInvestigationView(7L,
                new AlertInvestigationView.Window(start, end, start + 1L),
                new AlertInvestigationView.AlertHeader("High latency", "firing", "critical", "slow", null,
                        Map.of(), Map.of()), AlertInvestigationView.IdentityBlock.unavailable(),
                AlertInvestigationView.MetricsBlock.unavailable(InvestigationReason.QUERY_STRATEGY_UNAVAILABLE),
                AlertInvestigationView.LogsBlock.empty(), AlertInvestigationView.TracesBlock.empty(),
                AlertInvestigationView.TopologyBlock.empty(), AlertInvestigationView.CollectionBlock.empty());
    }

    @Test
    void getGroupAlertEvidenceReturnsFrozenSchema() throws Exception {
        List<String> requestedIds = List.of("2", "1", "3", "1");
        AlertGroupEvidence evidence = new AlertGroupEvidence(
                List.of(
                        new AlertGroupStatusEvidence(1L, CommonConstants.ALERT_STATUS_FIRING),
                        new AlertGroupStatusEvidence(2L, CommonConstants.ALERT_STATUS_PENDING)),
                List.of(3L),
                123456789L);
        Mockito.when(alertGroupEvidenceService.getEvidence(WORKSPACE_ID, requestedIds)).thenReturn(evidence);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/group/evidence")
                        .param("ids", "2", "1", "3", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.groups.length()").value(2))
                .andExpect(jsonPath("$.data.groups[0].id").value(1))
                .andExpect(jsonPath("$.data.groups[0].status").value("firing"))
                .andExpect(jsonPath("$.data.groups[1].id").value(2))
                .andExpect(jsonPath("$.data.groups[1].status").value("pending"))
                .andExpect(jsonPath("$.data.missingIds[0]").value(3))
                .andExpect(jsonPath("$.data.observedAt").value(123456789L));

        Mockito.verify(alertGroupEvidenceService).getEvidence(WORKSPACE_ID, requestedIds);
    }

    @Test
    void getGroupAlertEvidenceInvalidRequestReturnsStableSafeFailure() throws Exception {
        Mockito.when(alertGroupEvidenceService.getEvidence(WORKSPACE_ID, List.of("-6565463543")))
                .thenThrow(new AlertGroupEvidenceRequestException());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/group/evidence")
                        .param("ids", "-6565463543"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Invalid alert group evidence request."))
                .andExpect(content().string(not(containsString("6565463543"))));
    }

    @Test
    void getGroupAlertEvidenceFailureDoesNotExposeExceptionDetails() throws Exception {
        Mockito.when(alertGroupEvidenceService.getEvidence(WORKSPACE_ID, List.of("7")))
                .thenThrow(new IllegalStateException(
                        "token=private-evidence-token payload=private-alert-payload"));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/alerts/group/evidence")
                        .param("ids", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Alert group evidence query failed."))
                .andExpect(content().string(not(containsString("private-evidence-token"))))
                .andExpect(content().string(not(containsString("private-alert-payload"))));
    }

    @Test
    void deleteGroupAlerts() throws Exception {
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .delete("/api/alerts/group")
                                .param("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":null,\"code\":0}"))
                .andReturn();
    }

    @Test
    void deleteGroupAlertsMissingTargetReturnsStableSafeFailure() throws Exception {
        HashSet<Long> missingIds = new HashSet<>(List.of(6565463543L));
        Mockito.doThrow(new AlertGroupNotFoundException())
                .when(alertService).deleteGroupAlerts(WORKSPACE_ID, missingIds);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/alerts/group")
                        .param("ids", "6565463543"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Alert group was not found."))
                .andExpect(content().string(not(containsString("6565463543"))));
    }

    @Test
    void deleteGroupAlertsGenericFailureDoesNotExposeExceptionDetails() throws Exception {
        HashSet<Long> ids = new HashSet<>(List.of(7L));
        Mockito.doThrow(new IllegalStateException(
                        "token=private-delete-token payload=private-alert-payload"))
                .when(alertService).deleteGroupAlerts(WORKSPACE_ID, ids);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/alerts/group")
                        .param("ids", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Alert group delete failed."))
                .andExpect(content().string(not(containsString("private-delete-token"))))
                .andExpect(content().string(not(containsString("private-alert-payload"))));
    }

    @Test
    void applyGroupAlertStatus() throws Exception {
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .put("/api/alerts/group/status/resolved")
                                .param("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":null,\"code\":0}"))
                .andReturn();
    }

    @Test
    void applyGroupAlertAcknowledgedStatus() throws Exception {
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .put("/api/alerts/group/status/acknowledged")
                                .param("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":null,\"code\":0}"))
                .andReturn();
    }

    @Test
    void applyGroupAlertStatusMissingTargetReturnsStableSafeFailure() throws Exception {
        Mockito.doThrow(new AlertGroupNotFoundException())
                .when(alertService).editGroupAlertStatus(WORKSPACE_ID, "acknowledged", List.of(6565463543L));

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/alerts/group/status/acknowledged")
                        .param("ids", "6565463543"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Alert group was not found."))
                .andExpect(content().string(not(containsString("6565463543"))));
    }

    @Test
    void applyGroupAlertStatusGenericFailureDoesNotExposeExceptionDetails() throws Exception {
        Mockito.doThrow(new IllegalStateException(
                        "token=private-alert-token payload=private-alert-payload"))
                .when(alertService).editGroupAlertStatus(WORKSPACE_ID, "resolved", List.of(7L));

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/alerts/group/status/resolved")
                        .param("ids", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Alert group status update failed."))
                .andExpect(content().string(not(containsString("private-alert-token"))))
                .andExpect(content().string(not(containsString("private-alert-payload"))));
    }

    @Test
    void applyGroupAlertStatusRejectsUnsupportedPathValueWithStableSafeFailure() throws Exception {
        Mockito.doThrow(new AlertGroupStatusNotSupportedException())
                .when(alertService).editGroupAlertStatus(
                        WORKSPACE_ID, "private-arbitrary-status", List.of(6565463543L));

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/alerts/group/status/private-arbitrary-status")
                        .param("ids", "6565463543"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Alert group status is not supported."))
                .andExpect(content().string(not(containsString("private-arbitrary-status"))))
                .andExpect(content().string(not(containsString("6565463543"))));
    }

    @Test
    void applyGroupAlertStatusKeepsEmptyIdsAsLegacySuccessNoOp() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/alerts/group/status/private-arbitrary-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":null,\"code\":0}"));

        Mockito.verifyNoInteractions(alertService);
    }

    @Test
    void applySingleAlertAcknowledgedStatus() throws Exception {
        mockMvc.perform(
                        MockMvcRequestBuilders
                                .put("/api/alerts/status/acknowledged")
                                .param("ids", ids.stream().map(String::valueOf).collect(Collectors.joining(",")))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":null,\"msg\":null,\"code\":0}"))
                .andReturn();
    }

    @Test
    void getAlertsSummary() throws Exception {
        Mockito.when(alertService.getAlertsSummary(WORKSPACE_ID)).thenReturn(new AlertSummary());

        mockMvc.perform(
                        MockMvcRequestBuilders
                                .get("/api/alerts/summary")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(content().json("{\"data\":{\"total\":0,\"dealNum\":0,\"rate\":0.0,\"priorityWarningNum\":0,\"priorityCriticalNum\":0,\"priorityEmergencyNum\":0},\"msg\":null,\"code\":0}"))
                .andReturn();
    }
}
