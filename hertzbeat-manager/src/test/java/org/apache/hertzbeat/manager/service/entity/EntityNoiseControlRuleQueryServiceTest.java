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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for workspace-scoped silence and inhibit rule lookup used by entity noise-control evidence.
 */
@ExtendWith(MockitoExtension.class)
class EntityNoiseControlRuleQueryServiceTest {

    @InjectMocks
    private EntityNoiseControlRuleQueryService entityNoiseControlRuleQueryService;

    @Mock
    private AlertSilenceDao alertSilenceDao;
    @Mock
    private AlertInhibitDao alertInhibitDao;

    @Test
    void findEnabledSilencesFiltersDisabledAndRequestWorkspaceRules() {
        AlertSilence disabled = AlertSilence.builder()
                .id(1L)
                .name("disabled")
                .enable(false)
                .matchAll(true)
                .build();
        AlertSilence globalMatchAll = AlertSilence.builder()
                .id(2L)
                .name("global match all")
                .enable(true)
                .matchAll(true)
                .build();
        AlertSilence teamBeta = AlertSilence.builder()
                .id(3L)
                .name("team-b")
                .enable(true)
                .matchAll(false)
                .labels(Map.of(
                        "hertzbeat.workspace_id", "team-b",
                        CommonConstants.LABEL_INSTANCE, "checkout-api.default.svc.cluster.local"
                ))
                .build();
        AlertSilence teamAlpha = AlertSilence.builder()
                .id(4L)
                .name("team-a")
                .enable(true)
                .matchAll(false)
                .labels(Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout-api.default.svc.cluster.local"
                ))
                .build();
        when(alertSilenceDao.findAlertSilencesByEnableTrue()).thenReturn(List.of(globalMatchAll, teamBeta, teamAlpha));

        List<AlertSilence> scopedRules = entityNoiseControlRuleQueryService.findEnabledSilences("team-a");
        List<AlertSilence> defaultRules = entityNoiseControlRuleQueryService.findEnabledSilences(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID);

        assertEquals(List.of(teamAlpha), scopedRules);
        assertEquals(List.of(globalMatchAll), defaultRules);
        verify(alertSilenceDao, never()).findAll();
    }

    @Test
    void findEnabledInhibitsFiltersDisabledAndRequestWorkspaceRules() {
        AlertInhibit disabled = AlertInhibit.builder()
                .id(11L)
                .name("disabled")
                .enable(false)
                .targetLabels(Map.of(CommonConstants.LABEL_INSTANCE, "checkout-api.default.svc.cluster.local"))
                .build();
        AlertInhibit generic = AlertInhibit.builder()
                .id(12L)
                .name("generic")
                .enable(true)
                .targetLabels(Map.of(CommonConstants.LABEL_INSTANCE, "checkout-api.default.svc.cluster.local"))
                .build();
        AlertInhibit teamBeta = AlertInhibit.builder()
                .id(13L)
                .name("team-b")
                .enable(true)
                .sourceLabels(Map.of("hertzbeat.workspace_id", "team-b"))
                .targetLabels(Map.of(CommonConstants.LABEL_INSTANCE, "checkout-api.default.svc.cluster.local"))
                .build();
        AlertInhibit teamAlpha = AlertInhibit.builder()
                .id(14L)
                .name("team-a")
                .enable(true)
                .targetLabels(Map.of(
                        "hertzbeat.workspace_id", "team-a",
                        CommonConstants.LABEL_INSTANCE, "checkout-api.default.svc.cluster.local"
                ))
                .build();
        when(alertInhibitDao.findAlertInhibitsByEnableIsTrue()).thenReturn(List.of(generic, teamBeta, teamAlpha));

        List<AlertInhibit> scopedRules = entityNoiseControlRuleQueryService.findEnabledInhibits("team-a");
        List<AlertInhibit> defaultRules = entityNoiseControlRuleQueryService.findEnabledInhibits(
                AuthTokenScopes.DEFAULT_WORKSPACE_ID);

        assertEquals(List.of(teamAlpha), scopedRules);
        assertEquals(List.of(generic), defaultRules);
        verify(alertInhibitDao, never()).findAll();
    }
}
