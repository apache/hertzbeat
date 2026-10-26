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

package org.apache.hertzbeat.ai.gateway.tool.navigation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;

class AgentNativeOperationToolServiceTest {
    @Test
    void handoffNeverClaimsExecutionOrAcceptsArbitraryUrls() throws Exception {
        var service = new AgentNativeOperationToolService();
        for (var method : AgentNativeOperationToolService.class.getDeclaredMethods()) {
            if (method.getAnnotation(Tool.class) == null) {
                continue;
            }
            assertEquals(AgentToolExposure.MODEL_ON_DEMAND, method.getAnnotation(AgentToolPolicy.class).exposure());
            @SuppressWarnings("unchecked")
            var result = (java.util.Map<String, Object>) (method.getParameterCount() == 0
                    ? method.invoke(service) : method.invoke(service, 7L));
            assertEquals("NOT_EXECUTED", result.get("executionStatus"));
            assertEquals("native_handoff", result.get("delivery"));
            assertEquals(true, result.get("requiresUserAction"));
            assertTrue(result.get("path").toString().startsWith("/"));
        }
        assertEquals(AgentToolAccess.ADMIN, AgentNativeOperationToolService.class.getMethod("tokenManage")
                .getAnnotation(AgentToolPolicy.class).access());
        assertThrows(IllegalArgumentException.class, () -> service.monitorEdit(-1L));
    }
}
