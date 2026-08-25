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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.alert.dao.AlertAnalysisPolicyDao;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

/** Workspace authority contracts for automatic alert-analysis policies. */
@ExtendWith(MockitoExtension.class)
class AlertAnalysisPolicyServiceTest {

    @Mock
    private AlertAnalysisPolicyDao policyDao;

    private AlertAnalysisPolicyService service;

    @BeforeEach
    void setUp() {
        StaticListableBeanFactory beanFactory = new StaticListableBeanFactory();
        beanFactory.addBean("availability", (AgentClientAvailability) () -> true);
        service = new AlertAnalysisPolicyService(policyDao, beanFactory.getBeanProvider(AgentClientAvailability.class));
    }

    @Test
    void createPersistsTrustedWorkspaceButJsonDoesNotExposeIt() {
        when(policyDao.save(any(AlertAnalysisPolicy.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AlertAnalysisPolicy created = service.create("team-a", "policy", Map.of(), List.of("instance"),
                300L, 2, 1800L);

        ArgumentCaptor<AlertAnalysisPolicy> captor = ArgumentCaptor.forClass(AlertAnalysisPolicy.class);
        verify(policyDao).save(captor.capture());
        assertEquals("team-a", captor.getValue().getWorkspaceId());
        assertFalse(JsonUtil.toJson(created).contains("workspaceId"));
    }

    @Test
    void listToggleAndDeleteAreExactlyWorkspaceScoped() {
        AlertAnalysisPolicy teamB = AlertAnalysisPolicy.builder().id(9L).workspaceId("team-b").build();
        when(policyDao.findAllByWorkspaceIdOrderByIdAsc("team-a")).thenReturn(List.of());
        when(policyDao.findByWorkspaceIdAndId("team-a", 9L)).thenReturn(Optional.empty());

        assertEquals(List.of(), service.findAll("team-a"));
        assertThrows(IllegalArgumentException.class, () -> service.toggle("team-a", 9L, false));
        assertThrows(IllegalArgumentException.class, () -> service.delete("team-a", 9L));

        verify(policyDao).findAllByWorkspaceIdOrderByIdAsc("team-a");
        verify(policyDao, org.mockito.Mockito.times(2)).findByWorkspaceIdAndId("team-a", 9L);
        verify(policyDao, never()).save(teamB);
        verify(policyDao, never()).delete(teamB);
    }

    @Test
    void foreignToggleFailsAsMissingBeforeCheckingAgentAvailability() {
        StaticListableBeanFactory beanFactory = new StaticListableBeanFactory();
        beanFactory.addBean("availability", (AgentClientAvailability) () -> false);
        AlertAnalysisPolicyService unavailableService = new AlertAnalysisPolicyService(
                policyDao, beanFactory.getBeanProvider(AgentClientAvailability.class));
        when(policyDao.findByWorkspaceIdAndId("team-a", 9L)).thenReturn(Optional.empty());

        IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
                () -> unavailableService.toggle("team-a", 9L, true));

        assertEquals("Alert analysis policy was not found", failure.getMessage());
        verify(policyDao).findByWorkspaceIdAndId("team-a", 9L);
        verify(policyDao, never()).save(any(AlertAnalysisPolicy.class));
    }
}
