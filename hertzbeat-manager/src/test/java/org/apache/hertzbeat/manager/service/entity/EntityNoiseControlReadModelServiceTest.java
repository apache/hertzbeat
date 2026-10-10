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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.pojo.dto.EntityDetailDto;
import org.apache.hertzbeat.manager.pojo.dto.EntityDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for the entity noise-control read model extracted from the large entity service.
 */
@ExtendWith(MockitoExtension.class)
class EntityNoiseControlReadModelServiceTest {

    @InjectMocks
    private EntityNoiseControlReadModelService noiseControlReadModelService;

    @Mock
    private EntityNoiseControlRuleQueryService entityNoiseControlRuleQueryService;
    @Mock
    private EntityWorkspaceAccessService entityWorkspaceAccessService;

    @Test
    void buildNoiseControlSummaryPrefersActiveAlertLabelsForRuleMatching() {
        EntityDto entityDto = entityDto("checkout-api", AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        Monitor monitor = Monitor.builder()
                .name("fallback-monitor")
                .instance("fallback.default.svc.cluster.local")
                .build();
        SingleAlert activeAlert = SingleAlert.builder()
                .labels(Map.of(
                        "service.name", "checkout-api.default.svc.cluster.local",
                        CommonConstants.LABEL_INSTANCE, "checkout-api.default.svc.cluster.local",
                        "severity", "critical"
                ))
                .build();
        AlertSilence silence = AlertSilence.builder()
                .id(701L)
                .name("checkout active alert silence")
                .enable(true)
                .matchAll(false)
                .labels(Map.of(CommonConstants.LABEL_INSTANCE, "checkout-api.default.svc.cluster.local"))
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 9, 0))
                .build();
        AlertInhibit inhibit = AlertInhibit.builder()
                .id(702L)
                .name("checkout active alert inhibit")
                .enable(true)
                .targetLabels(Map.of("service.name", "checkout-api.default.svc.cluster.local"))
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 9, 5))
                .build();
        when(entityNoiseControlRuleQueryService.findEnabledSilences(AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn(List.of(silence));
        when(entityNoiseControlRuleQueryService.findEnabledInhibits(AuthTokenScopes.DEFAULT_WORKSPACE_ID))
                .thenReturn(List.of(inhibit));

        EntityDetailDto.EntityNoiseControlSummaryInfo summary =
                noiseControlReadModelService.buildNoiseControlSummary(
                        entityDto, List.of(monitor), List.of(activeAlert), AuthTokenScopes.DEFAULT_WORKSPACE_ID);

        assertEquals(1, summary.getActiveSilenceCount());
        assertEquals(1, summary.getMatchingInhibitCount());
        assertFalse(summary.isPossibleAlertSuppression());
        assertEquals("checkout active alert silence", summary.getActiveSilences().getFirst().getName());
        assertEquals(List.of(CommonConstants.LABEL_INSTANCE), summary.getActiveSilences().getFirst().getMatchedLabels());
        assertEquals("checkout active alert inhibit", summary.getMatchingInhibits().getFirst().getName());
        verify(entityNoiseControlRuleQueryService).findEnabledSilences(AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        verify(entityNoiseControlRuleQueryService).findEnabledInhibits(AuthTokenScopes.DEFAULT_WORKSPACE_ID);
    }

    @Test
    void buildNoiseControlSummaryFiltersRulesByRequestWorkspace() {
        EntityDto entityDto = entityDto("noise-control-api", "team-a");
        Monitor monitor = Monitor.builder()
                .name("noise-control-api")
                .instance("noise-control-api.default.svc.cluster.local")
                .labels(Map.of("hertzbeat.workspace_id", "team-a"))
                .build();
        when(entityNoiseControlRuleQueryService.findEnabledSilences("team-a")).thenReturn(List.of(
                AlertSilence.builder()
                    .id(803L)
                    .name("team-a silence")
                    .enable(true)
                    .matchAll(false)
                    .labels(Map.of(
                            "hertzbeat.workspace_id", "team-a",
                            CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local"
                    ))
                    .gmtUpdate(LocalDateTime.of(2026, 5, 10, 10, 10))
                    .build()
        ));
        when(entityNoiseControlRuleQueryService.findEnabledInhibits("team-a")).thenReturn(List.of(
                AlertInhibit.builder()
                    .id(813L)
                    .name("team-a inhibit")
                    .enable(true)
                    .targetLabels(Map.of(
                            "hertzbeat.workspace_id", "team-a",
                            CommonConstants.LABEL_INSTANCE, "noise-control-api.default.svc.cluster.local"
                    ))
                    .gmtUpdate(LocalDateTime.of(2026, 5, 10, 10, 25))
                    .build()
        ));

        EntityDetailDto.EntityNoiseControlSummaryInfo summary =
                noiseControlReadModelService.buildNoiseControlSummary(entityDto, List.of(monitor), Collections.emptyList(), "team-a");

        assertEquals(1, summary.getActiveSilenceCount());
        assertEquals("team-a silence", summary.getActiveSilences().getFirst().getName());
        assertEquals(1, summary.getMatchingInhibitCount());
        assertEquals("team-a inhibit", summary.getMatchingInhibits().getFirst().getName());
        assertTrue(summary.isPossibleAlertSuppression());
        verify(entityNoiseControlRuleQueryService).findEnabledSilences("team-a");
        verify(entityNoiseControlRuleQueryService).findEnabledInhibits("team-a");
    }

    @Test
    void buildNoiseControlSummaryKeepsDefaultWorkspaceCompatibilityForUnlabeledRules() {
        EntityDto entityDto = entityDto("default-api", null);
        Monitor monitor = Monitor.builder()
                .name("default-api")
                .instance("default-api.default.svc.cluster.local")
                .build();
        when(entityNoiseControlRuleQueryService.findEnabledSilences(AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(List.of(AlertSilence.builder()
                .id(901L)
                .name("default match all")
                .enable(true)
                .matchAll(true)
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 11, 0))
                .build()));
        when(entityNoiseControlRuleQueryService.findEnabledInhibits(AuthTokenScopes.DEFAULT_WORKSPACE_ID)).thenReturn(List.of(AlertInhibit.builder()
                .id(902L)
                .name("default inhibit")
                .enable(true)
                .targetLabels(Map.of(CommonConstants.LABEL_INSTANCE, "default-api.default.svc.cluster.local"))
                .gmtUpdate(LocalDateTime.of(2026, 5, 10, 11, 5))
                .build()));

        EntityDetailDto.EntityNoiseControlSummaryInfo summary =
                noiseControlReadModelService.buildNoiseControlSummary(
                        entityDto, List.of(monitor), Collections.emptyList(), AuthTokenScopes.DEFAULT_WORKSPACE_ID);

        assertEquals(1, summary.getActiveSilenceCount());
        assertEquals("default match all", summary.getActiveSilences().getFirst().getName());
        assertEquals(1, summary.getMatchingInhibitCount());
        assertEquals("default inhibit", summary.getMatchingInhibits().getFirst().getName());
        assertTrue(summary.isPossibleAlertSuppression());
    }

    private EntityDto entityDto(String name, String workspaceId) {
        ObserveEntity entity = ObserveEntity.builder()
                .id(1L)
                .type("service")
                .name(name)
                .environment("prod")
                .workspaceId(workspaceId)
                .build();
        EntityDto dto = new EntityDto();
        dto.setEntity(entity);
        return dto;
    }
}
