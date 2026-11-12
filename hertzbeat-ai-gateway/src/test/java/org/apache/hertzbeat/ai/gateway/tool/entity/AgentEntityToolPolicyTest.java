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

package org.apache.hertzbeat.ai.gateway.tool.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.lang.reflect.Method;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.service.AgentServiceToolService;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;

class AgentEntityToolPolicyTest {
    @Test
    void newToolsAreOnDemandAndKeepRoleAndRiskIndependent() {
        for (Class<?> type : List.of(AgentEntityManagementToolService.class, AgentEntityDefinitionToolService.class,
                AgentEntityGovernanceToolService.class, AgentServiceToolService.class)) {
            for (Method method : type.getDeclaredMethods()) {
                Tool tool = method.getAnnotation(Tool.class);
                if (tool == null) {
                    continue;
                }
                AgentToolPolicy policy = method.getAnnotation(AgentToolPolicy.class);
                assertNotNull(policy, tool.name());
                assertEquals(AgentToolExposure.MODEL_ON_DEMAND, policy.exposure(), tool.name());
                if (tool.name().endsWith("delete")) {
                    assertEquals(AgentToolAccess.ADMIN, policy.access(), tool.name());
                    assertEquals(AgentToolRisk.DANGEROUS, policy.risk(), tool.name());
                }
                for (var parameter : method.getParameters()) {
                    assertFalse(List.of("workspaceId", "creator", "modifier", "actor", "roles").contains(parameter.getName()));
                }
            }
        }
    }
}
