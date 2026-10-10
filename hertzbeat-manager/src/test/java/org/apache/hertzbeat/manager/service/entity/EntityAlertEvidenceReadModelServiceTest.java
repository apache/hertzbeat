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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;

/**
 * Contract for entity alert evidence queries extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityAlertEvidenceReadModelServiceTest {

    @InjectMocks
    private EntityAlertEvidenceReadModelService alertEvidenceReadModelService;

    @Mock
    private EntityAlertEvidenceQueryService entityAlertEvidenceQueryService;

    @Test
    void queryActiveAlertsFiltersByRequestWorkspaceLabels() {
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
        when(entityAlertEvidenceQueryService.findActiveAlerts(List.of(monitor), 20, "team-a"))
                .thenReturn(List.of(teamAlphaAlert));

        List<SingleAlert> alerts =
                alertEvidenceReadModelService.queryActiveAlerts(List.of(monitor), 20, "team-a");

        assertEquals(List.of(teamAlphaAlert), alerts);
    }

    @Test
    void queryActiveAlertsUsesDefaultQueryWorkspaceForStatusRefresh() {
        Monitor monitor = monitor("checkout-api", "checkout.default.svc.cluster.local");
        SingleAlert teamAlphaAlert = alert(
                702L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 9, 5),
                Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        when(entityAlertEvidenceQueryService.findActiveAlerts(List.of(monitor), 20))
                .thenReturn(List.of(teamAlphaAlert));

        List<SingleAlert> alerts =
                alertEvidenceReadModelService.queryActiveAlerts(List.of(monitor), 20);

        assertEquals(List.of(teamAlphaAlert), alerts);
    }

    @Test
    void buildEntityAlertPageSortsSeverityBeforeRecencyAndPaginates() {
        Monitor monitor = monitor("checkout-api", "checkout.default.svc.cluster.local");
        SingleAlert newerWarning = alert(
                801L,
                CommonConstants.ALERT_STATUS_FIRING,
                "warning",
                LocalDateTime.of(2026, 5, 10, 10, 5),
                Collections.emptyMap()
        );
        SingleAlert olderCritical = alert(
                802L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 9, 50),
                Collections.emptyMap()
        );
        SingleAlert latestInfo = alert(
                803L,
                CommonConstants.ALERT_STATUS_FIRING,
                "info",
                LocalDateTime.of(2026, 5, 10, 10, 10),
                Collections.emptyMap()
        );
        when(entityAlertEvidenceQueryService.findAlerts(
                List.of(monitor), CommonConstants.ALERT_STATUS_FIRING, AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn(List.of(newerWarning, olderCritical, latestInfo));

        Page<SingleAlert> page = alertEvidenceReadModelService.buildEntityAlertPage(
                List.of(monitor), null, null, 0, 2, AuthTokenScopes.DEFAULT_WORKSPACE_ID);

        assertEquals(3, page.getTotalElements());
        assertEquals(List.of(olderCritical, newerWarning), page.getContent());
    }

    @Test
    void buildEntityAlertPageFiltersSeverityAndWorkspaceBeforeReturningEvidence() {
        Monitor monitor = monitor("checkout-api", "checkout.default.svc.cluster.local");
        SingleAlert teamAlphaCritical = alert(
                901L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 11, 0),
                Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        SingleAlert teamAlphaWarning = alert(
                902L,
                CommonConstants.ALERT_STATUS_FIRING,
                "warning",
                LocalDateTime.of(2026, 5, 10, 11, 5),
                Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        when(entityAlertEvidenceQueryService.findAlerts(List.of(monitor), CommonConstants.ALERT_STATUS_FIRING, "team-a"))
                .thenReturn(List.of(teamAlphaWarning, teamAlphaCritical));

        Page<SingleAlert> page = alertEvidenceReadModelService.buildEntityAlertPage(
                List.of(monitor), null, "CRITICAL", 0, 10, "team-a");

        assertEquals(1, page.getTotalElements());
        assertEquals(List.of(teamAlphaCritical), page.getContent());
    }

    @Test
    void buildEntityAlertPageUsesDefaultQueryWorkspaceForFacadeCalls() {
        Monitor monitor = monitor("checkout-api", "checkout.default.svc.cluster.local");
        SingleAlert teamAlphaAlert = alert(
                904L,
                CommonConstants.ALERT_STATUS_FIRING,
                "critical",
                LocalDateTime.of(2026, 5, 10, 11, 15),
                Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout.default.svc.cluster.local"
                )
        );
        when(entityAlertEvidenceQueryService.findAlerts(List.of(monitor), CommonConstants.ALERT_STATUS_FIRING))
                .thenReturn(List.of(teamAlphaAlert));

        Page<SingleAlert> page = alertEvidenceReadModelService.buildEntityAlertPage(
                List.of(monitor), null, null, 0, 10);

        assertEquals(1, page.getTotalElements());
        assertEquals(List.of(teamAlphaAlert), page.getContent());
    }

    @Test
    void buildEntityAlertPageDoesNotQueryWhenNoMonitorsAreBound() {
        Page<SingleAlert> page = alertEvidenceReadModelService.buildEntityAlertPage(
                Collections.emptyList(), null, null, 0, 10, AuthTokenScopes.DEFAULT_WORKSPACE_ID);

        assertTrue(page.isEmpty());
        verifyNoInteractions(entityAlertEvidenceQueryService);
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
