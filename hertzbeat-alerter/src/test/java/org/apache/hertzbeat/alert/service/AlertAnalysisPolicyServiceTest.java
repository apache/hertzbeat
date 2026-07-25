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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.AlertAnalysisPolicyDao;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

/** Tests policy validation and the Agent client prerequisite. */
@ExtendWith(MockitoExtension.class)
class AlertAnalysisPolicyServiceTest {

    @Mock
    private AlertAnalysisPolicyDao policyDao;

    @Mock
    private ObjectProvider<AgentClientAvailability> agentClientAvailabilityProvider;

    @InjectMocks
    private AlertAnalysisPolicyService policyService;

    @Test
    void createUsesDocumentedDefaultsWhenAgentClientIsConfigured() {
        configureAgentClient();
        when(policyDao.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        AlertAnalysisPolicy policy = policyService.create("Production hosts", Map.of("env", "prod"),
                List.of("instance"), null, null, null);

        assertEquals(300, policy.getWindowSeconds());
        assertEquals(2, policy.getMinimumAlertCount());
        assertEquals(1800, policy.getCooldownSeconds());
    }

    @Test
    void createAndEnableRejectMissingAgentClientConfiguration() {
        assertFalse(policyService.isAgentClientConfigured());
        assertThrows(IllegalStateException.class, () -> policyService.create("Production hosts", Map.of(),
                List.of("instance"), 300L, 2, 1800L));
        assertThrows(IllegalStateException.class, () -> policyService.toggle(1L, true));
    }

    @Test
    void disableDoesNotRequireAgentClientConfiguration() {
        AlertAnalysisPolicy policy = AlertAnalysisPolicy.builder().id(1L).enabled(true).build();
        when(policyDao.findById(1L)).thenReturn(java.util.Optional.of(policy));
        when(policyDao.save(policy)).thenReturn(policy);

        assertFalse(policyService.toggle(1L, false).isEnabled());
    }

    @Test
    void configuredAgentClientIsReportedAvailable() {
        configureAgentClient();

        assertTrue(policyService.isAgentClientConfigured());
    }

    private void configureAgentClient() {
        when(agentClientAvailabilityProvider.getIfAvailable()).thenReturn(() -> true);
    }
}
