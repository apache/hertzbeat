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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class AgentMonitorDefinitionDraftTest {
    @Test
    void exactDraftHashAndIdentityRejectsCredentialBearingYaml() {
        var first =
                AgentMonitorDefinitionDraft.inspect("app: ai-e2e-template\nname: {en-US: Test}\n");
        assertEquals("ai-e2e-template", first.app());
        assertNotEquals(
                first.definitionHash(),
                AgentMonitorDefinitionDraft.inspect(
                                "app: ai-e2e-template\nname: {en-US: Changed}\n")
                        .definitionHash());
        for (String yaml :
                new String[] {
                    "app: ../outside",
                    "app: test\npassword: inline-secret",
                    "app: test\nparams: [{field: password, defaultValue: inline-secret}]",
                    "app: test\napp: duplicate",
                    "!!java.lang.ProcessBuilder [whoami]",
                    "app: test\n"
                            + "params: [{field: header, defaultValue: 'Authorization: Bearer"
                            + " inline-secret'}]"
                }) {
            assertThrows(
                    IllegalArgumentException.class,
                    () -> AgentMonitorDefinitionDraft.inspect(yaml));
        }
        AgentMonitorDefinitionDraft.inspect(
                "app: ai-e2e-template\n"
                        + "params: [{field: password, type: password}]\n"
                        + "metrics: [{password: '^_^password^_^'}]");
        assertThrows(
                IllegalArgumentException.class,
                () -> AgentMonitorDefinitionDraft.inspect("app: test\nx: " + "a".repeat(65536)));
    }

    @Test
    void publicNativeWebsiteTemplateWithCredentialPlaceholdersPassesRealValidation()
            throws Exception {
        try (var in =
                org.apache.hertzbeat.manager.service.impl.AppServiceImpl.class.getResourceAsStream(
                        "/define/app-website.yml")) {
            String definition =
                    new String(
                                    java.util.Objects.requireNonNull(in).readAllBytes(),
                                    java.nio.charset.StandardCharsets.UTF_8)
                            .replace("app: website", "app: ai-e2e-template-native");
            assertEquals(
                    "ai-e2e-template-native",
                    AgentMonitorDefinitionDraft.inspect(definition).app());
            var nativeValidator =
                    new org.apache.hertzbeat.manager.service.impl.AppServiceImpl(
                            null, null, null, null, null, null);
            assertEquals("ai-e2e-template-native", nativeValidator.validate(definition).getApp());
            assertThrows(
                    IllegalArgumentException.class,
                    () ->
                            AgentMonitorDefinitionDraft.inspect(
                                    definition.replace(
                                            "basicAuthPassword: ^_^password^_^",
                                            "basicAuthPassword: inline-secret")));
        }
    }
}
