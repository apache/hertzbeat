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

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dto.AlertAnalysisPolicyRequest;
import org.apache.hertzbeat.alert.service.AlertAnalysisPolicyService;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Tests the alert analysis policy API boundary. */
@ExtendWith(MockitoExtension.class)
class AlertAnalysisControllerTest {

    @Mock
    private AlertAnalysisPolicyService policyService;

    @Test
    void delegatesPolicyOperationsToService() {
        AlertAnalysisPolicy policy = AlertAnalysisPolicy.builder().id(1L).name("Production").build();
        AlertAnalysisPolicyRequest request = new AlertAnalysisPolicyRequest("Production", Map.of("env", "prod"),
                List.of("instance"), 300L, 2, 1800L);
        when(policyService.isAgentClientConfigured()).thenReturn(true);
        when(policyService.findAll()).thenReturn(List.of(policy));
        when(policyService.create("Production", Map.of("env", "prod"), List.of("instance"), 300L, 2, 1800L))
                .thenReturn(policy);
        when(policyService.toggle(1L, false)).thenReturn(policy);

        AlertAnalysisController controller = new AlertAnalysisController(policyService);

        assertTrue(controller.availability().getBody().getData());
        assertSame(policy, controller.listPolicies().getBody().getData().get(0));
        assertSame(policy, controller.createPolicy(request).getBody().getData());
        assertSame(policy, controller.togglePolicy(1L, false).getBody().getData());
        controller.deletePolicy(1L);

        verify(policyService).delete(1L);
    }
}
