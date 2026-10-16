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

package org.apache.hertzbeat.ai.gateway.application;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.contract.AgentAlertIncidentContext;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.alert.service.AlertAnalysisPolicyService;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.Test;

class AgentIncidentTargetAuthorityServiceTest {
    private final AlertAnalysisPolicyService policies = mock(AlertAnalysisPolicyService.class);
    private final AlertService alerts = mock(AlertService.class);
    private final AgentIncidentTargetAuthorityService service = new AgentIncidentTargetAuthorityService(
            policies, alerts, new AgentSingleAlertTargetAuthorityService(alerts));

    @Test
    void persistsOnlyRevalidatedIncidentAndRejectsAuthorityChanges() {
        seed();
        AgentTargetRef target = service.canonicalize("w", incident(), 2000);
        assertTrue(service.verify("w", target));
        assertTrue(AgentIncidentTargetAuthorityService.permits(target, "alert.get",
                Map.of("alertId", 42, "alertType", "single")));
        assertFalse(AgentIncidentTargetAuthorityService.permits(target, "alert.get",
                Map.of("alertId", 43, "alertType", "single")));
        assertFalse(AgentIncidentTargetAuthorityService.permits(target, "metrics.history", Map.of()));
        assertFalse(service.verify("other", target));
        when(policies.findEnabled("w")).thenReturn(List.of());
        assertFalse(service.verify("w", target));
    }

    @Test
    void foreignAlertAndStaleWindowFailClosed() {
        seed();
        when(alerts.findSingleAlert("w", 42L)).thenReturn(Optional.of(alert("other")));
        assertThrows(IllegalArgumentException.class, () -> service.canonicalize("w", incident(), 2000));
        seed();
        assertThrows(IllegalArgumentException.class, () -> service.canonicalize("w", incident(), 400000));
    }

    @Test
    void emptyDuplicateAndMissingTriggerIdsCannotFormAuthority() {
        seed();
        for (List<Long> ids : List.of(List.<Long>of(), List.of(42L, 42L), List.of(43L))) {
            AgentAlertIncidentContext incident = new AgentAlertIncidentContext(1L, 42L, ids, 1, 1000);
            assertThrows(IllegalArgumentException.class, () -> service.canonicalize("w", incident, 2000));
        }
    }

    private void seed() {
        when(policies.findEnabled("w")).thenReturn(List.of(AlertAnalysisPolicy.builder().id(1L)
                .workspaceId("w").enabled(true).windowSeconds(300L).minimumAlertCount(1)
                .matchLabels(Map.of("team", "ops")).groupByLabels(List.of("team")).build()));
        when(alerts.findSingleAlert("w", 42L)).thenReturn(Optional.of(alert("w")));
    }

    private SingleAlert alert(String workspace) {
        return SingleAlert.builder().id(42L).workspaceId(workspace).status("firing")
                .activeAt(1500L).labels(Map.of("team", "ops")).annotations(Map.of()).build();
    }

    private AgentAlertIncidentContext incident() {
        return new AgentAlertIncidentContext(1L, 42L, List.of(42L), 1, 1000);
    }
}
