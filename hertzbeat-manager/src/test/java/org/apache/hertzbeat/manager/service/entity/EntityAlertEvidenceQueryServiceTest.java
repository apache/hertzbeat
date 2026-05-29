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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/**
 * Contract for monitor-linked raw alert evidence lookup and workspace eligibility.
 */
@ExtendWith(MockitoExtension.class)
class EntityAlertEvidenceQueryServiceTest {

    @InjectMocks
    private EntityAlertEvidenceQueryService entityAlertEvidenceQueryService;

    @Mock
    private SingleAlertDao singleAlertDao;

    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void findActiveAlertsFiltersByRequestWorkspaceLabels() {
        Monitor monitor = monitor("checkout-api", "checkout.default.svc.cluster.local");
        SingleAlert teamAlphaAlert = alert(
                701L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 9, 0),
                Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        SingleAlert teamBetaAlert = alert(
                702L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 9, 5),
                Map.of(
                        "hertzbeat.workspace_id", "team-b",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        when(singleAlertDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(teamAlphaAlert, teamBetaAlert)));

        List<SingleAlert> alerts =
                entityAlertEvidenceQueryService.findActiveAlerts(List.of(monitor), 20, "team-a");

        assertEquals(List.of(teamAlphaAlert), alerts);
    }

    @Test
    void findActiveAlertsUsesCurrentRequestWorkspaceForDefaultCall() {
        Monitor monitor = monitor("checkout-api", "checkout.default.svc.cluster.local");
        SingleAlert teamAlphaAlert = alert(
                703L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 9, 10),
                Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        SingleAlert teamBetaAlert = alert(
                704L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 9, 15),
                Map.of(
                        "hertzbeat.workspace_id", "team-b",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(singleAlertDao.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(teamAlphaAlert, teamBetaAlert)));

        List<SingleAlert> alerts = entityAlertEvidenceQueryService.findActiveAlerts(List.of(monitor), 20);

        assertEquals(List.of(teamAlphaAlert), alerts);
        verify(entityWorkspaceAccessService).currentRequestWorkspaceId();
    }

    @Test
    void findAlertsKeepsDefaultWorkspaceCompatibilityForUnlabeledRows() {
        Monitor monitor = monitor("checkout-api", "checkout.default.svc.cluster.local");
        SingleAlert unlabeledDefault = alert(
                801L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 10, 0),
                Collections.emptyMap()
        );
        SingleAlert teamAlphaAlert = alert(
                802L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 10, 5),
                Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        when(singleAlertDao.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(unlabeledDefault, teamAlphaAlert));

        List<SingleAlert> defaultAlerts = entityAlertEvidenceQueryService.findAlerts(
                List.of(monitor), CommonConstants.ALERT_STATUS_FIRING, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        List<SingleAlert> teamAlphaAlerts = entityAlertEvidenceQueryService.findAlerts(
                List.of(monitor), CommonConstants.ALERT_STATUS_FIRING, "team-a");

        assertEquals(List.of(unlabeledDefault), defaultAlerts);
        assertEquals(List.of(teamAlphaAlert), teamAlphaAlerts);
    }

    @Test
    void findAlertsUsesCurrentRequestWorkspaceForDefaultCall() {
        Monitor monitor = monitor("checkout-api", "checkout.default.svc.cluster.local");
        SingleAlert teamAlphaAlert = alert(
                901L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 10, 10),
                Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        SingleAlert teamBetaAlert = alert(
                902L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 10, 15),
                Map.of(
                        "hertzbeat.workspace_id", "team-b",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        when(entityWorkspaceAccessService.currentRequestWorkspaceId()).thenReturn("team-a");
        when(singleAlertDao.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(teamAlphaAlert, teamBetaAlert));

        List<SingleAlert> alerts = entityAlertEvidenceQueryService.findAlerts(
                List.of(monitor), CommonConstants.ALERT_STATUS_FIRING);

        assertEquals(List.of(teamAlphaAlert), alerts);
        verify(entityWorkspaceAccessService).currentRequestWorkspaceId();
    }

    @Test
    void findAlertsDoesNotQueryWhenNoMonitorsAreBound() {
        List<SingleAlert> alerts = entityAlertEvidenceQueryService.findAlerts(
                Collections.emptyList(), CommonConstants.ALERT_STATUS_FIRING, "team-a");

        assertEquals(Collections.emptyList(), alerts);
        verifyNoInteractions(singleAlertDao);
    }

    private Monitor monitor(String name, String instance) {
        return Monitor.builder()
                .name(name)
                .instance(instance)
                .build();
    }

    private SingleAlert alert(Long id, String status, String severity, LocalDateTime gmtUpdate,
                              Map<String, String> labels) {
        return SingleAlert.builder()
                .id(id)
                .status(status)
                .labels(labels == null || labels.isEmpty()
                        ? Map.of("severity", severity)
                        : withSeverity(labels, severity))
                .gmtUpdate(gmtUpdate)
                .build();
    }

    private Map<String, String> withSeverity(Map<String, String> labels, String severity) {
        java.util.LinkedHashMap<String, String> values = new java.util.LinkedHashMap<>(labels);
        values.put("severity", severity);
        return values;
    }
}
