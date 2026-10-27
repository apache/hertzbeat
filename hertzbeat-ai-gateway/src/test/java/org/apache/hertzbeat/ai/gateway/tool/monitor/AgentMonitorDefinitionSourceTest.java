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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionDetailResponse;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionOrigin;
import org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionService;
import org.junit.jupiter.api.Test;

class AgentMonitorDefinitionSourceTest {
    private final MonitorDefinitionService nativeService = mock(MonitorDefinitionService.class);

    private MonitorDefinitionDetailResponse detail(String app, String text) {
        return new MonitorDefinitionDetailResponse(
                1,
                app,
                "AI fixture",
                MonitorDefinitionOrigin.CUSTOM,
                true,
                true,
                false,
                text,
                "a".repeat(64));
    }

    @Test
    void returnsExactNonSecretYamlWithIndependentHashAndCurrentRevision() {
        String yaml =
                "app: ai-e2e-source\n"
                        + "params:\n"
                        + "  - field: password\n"
                        + "    default: ${password}\n"
                        + "metrics: []\n";
        when(nativeService.detail("ai-e2e-source", "en-US"))
                .thenReturn(detail("ai-e2e-source", yaml));
        var result =
                new AgentMonitorDefinitionSourceToolService(nativeService)
                        .source("ai-e2e-source", "en-US");
        assertEquals(true, result.get("available"));
        assertEquals(yaml, result.get("definition"));
        assertEquals("a".repeat(64), result.get("revision"));
        assertEquals(
                AgentMonitorDefinitionDraft.inspect(yaml).definitionHash(),
                result.get("definitionHash"));
    }

    @Test
    void refusesLiteralCredentialsAndOversizeWithoutReturningContents() {
        for (String yaml :
                java.util.List.of(
                        "app: ai-e2e-source\npassword: sentinel-private-value\n",
                        "app: ai-e2e-source\nlabel: " + "x".repeat(65536))) {
            when(nativeService.detail("ai-e2e-source", "en-US"))
                    .thenReturn(detail("ai-e2e-source", yaml));
            var result =
                    new AgentMonitorDefinitionSourceToolService(nativeService)
                            .source("ai-e2e-source", "en-US");
            assertEquals(false, result.get("available"));
            assertFalse(result.containsKey("definition"));
            assertFalse(JsonUtil.toJson(result).contains("sentinel-private-value"));
            assertEquals("NATIVE_SECURE_EDITOR_REQUIRED", result.get("reasonCode"));
        }
    }

    @Test
    void rejectsIdentityMismatchAndCallerPathsBeforeNativeReads() {
        var tool = new AgentMonitorDefinitionSourceToolService(nativeService);
        assertThrows(
                org.apache.hertzbeat.manager.monitor.definition.MonitorDefinitionException.class,
                () -> tool.source("../private", "en-US"));
        verifyNoInteractions(nativeService);
        when(nativeService.detail("ai-e2e-source", "en-US"))
                .thenReturn(detail("another", "app: another\nmetrics: []\n"));
        assertThrows(IllegalStateException.class, () -> tool.source("ai-e2e-source", "en-US"));
    }

    @Test
    void transportRedactionCannotTurnExactSourceIntoCorruptEditableYaml() {
        String yaml =
                "app: ai-e2e-source\n"
                    + "authorization:\n"
                    + "  type: Basic Auth\n"
                    + "  basicAuthUsername: ${username}\n"
                    + "  basicAuthPassword: ${password}\n"
                    + "metrics: []\n";
        AgentMonitorDefinitionDraft.inspect(yaml);
        when(nativeService.detail("ai-e2e-source", "en-US"))
                .thenReturn(detail("ai-e2e-source", yaml));
        var result =
                new AgentMonitorDefinitionSourceToolService(nativeService)
                        .source("ai-e2e-source", "en-US");
        String serialized = JsonUtil.toJson(result);
        assertEquals(
                serialized,
                org.apache.hertzbeat.ai.gateway.text.GatewayText.redactSecrets(serialized));
        assertFalse(result.containsKey("definition"));
        assertEquals(false, result.get("available"));
    }
}
