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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.apache.hertzbeat.alert.service.AlertAnalysisPolicyService;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** Workspace propagation contracts for alert-analysis policy tools. */
class AgentAlertAnalysisPolicyToolServiceTest {

    private final AlertAnalysisPolicyService policyService = mock(AlertAnalysisPolicyService.class);
    private final AgentAlertAnalysisPolicyToolService toolService =
            new AgentAlertAnalysisPolicyToolService(policyService);

    @AfterEach
    void clearRequestContext() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void listToggleAndDeleteUseTheTrustedRuntimeWorkspace() {
        AuthTokenRequestContext.bindWorkspaceId("team-a");

        toolService.list();
        toolService.toggle(7L, false);
        toolService.delete(7L, "obsolete");

        verify(policyService).findAll("team-a");
        verify(policyService).toggle("team-a", 7L, false);
        verify(policyService).delete("team-a", 7L);
    }

    @Test
    void missingRuntimeWorkspaceFailsBeforePolicyAccess() {
        assertThrows(IllegalArgumentException.class, toolService::list);

        verifyNoInteractions(policyService);
    }
}
