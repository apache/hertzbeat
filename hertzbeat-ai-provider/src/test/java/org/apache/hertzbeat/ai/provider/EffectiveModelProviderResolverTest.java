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

package org.apache.hertzbeat.ai.provider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.support.ModelProviderConfigurationService;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

/** Saved and YAML paths obey the same selection contract. */
class EffectiveModelProviderResolverTest {
    @Test
    void savedSelectionWinsAndInvalidSelectionCannotFallBack() {
        var service = mock(ModelProviderConfigurationService.class);
        var resolver = new EffectiveModelProviderResolver(service, environment());
        var saved = new ModelProviderConfig();
        saved.setName("saved");
        when(service.getActiveConfiguration()).thenReturn(saved);
        assertSame(saved, resolver.resolve());
        when(service.getActiveConfiguration()).thenThrow(new IllegalStateException("invalid"));
        assertThrows(IllegalStateException.class, resolver::resolve);
    }

    @Test
    void yamlBindsProtocolAndCustomAuthenticationOnlyWithoutSelection() {
        var resolver = new EffectiveModelProviderResolver(mock(ModelProviderConfigurationService.class), environment());
        ModelProviderConfig config = resolver.resolve();
        assertEquals("openai-responses", config.getProtocol());
        assertEquals("none", config.getAuthMode());
        assertEquals("http://localhost:1234/custom/v1/responses", ModelConnection.endpoint(config));
        assertEquals("yaml-model", ModelConnection.validate(config).getModel());
    }

    @Test
    void explicitProtocolNeverSubstitutesMissingModelOrUrl() {
        var config = new ModelProviderConfig();
        config.setProtocol("openai-chat");
        config.setName("custom");
        config.setAuthMode("none");
        assertThrows(IllegalArgumentException.class, () -> ModelConnection.validate(config));
        config.setModel("custom-model");
        assertThrows(IllegalArgumentException.class, () -> ModelConnection.validate(config));
        config.setBaseUrl("https://user:secret@example.com/v1");
        assertThrows(IllegalArgumentException.class, () -> ModelConnection.validate(config));
        config.setBaseUrl("https://example.com/v1");
        config.setHeaders(Map.of("X-Token", "secret\r\nInjected: value"));
        assertThrows(IllegalArgumentException.class, () -> ModelConnection.validate(config));
    }

    @Test
    void protocolStateCannotReplaySuppressedAssistantText() {
        var config = new ModelProviderConfig();
        config.setProtocol("openai-responses");
        config.setModel("m");
        var stream = new ProtocolStream(config);
        try {
            var json = new com.fasterxml.jackson.databind.ObjectMapper();
            stream.accept(json.readTree("{\"type\":\"response.output_item.done\",\"output_index\":0,"
                    + "\"item\":{\"type\":\"message\",\"role\":\"assistant\",\"content\":[{\"type\":\"output_text\",\"text\":\"suppressed\"}]}}"));
            stream.accept(json.readTree("{\"type\":\"response.completed\",\"response\":{}}"));
            var assistant = stream.finish().getResult().getOutput();
            var body = ProtocolRequest.body(config, new org.springframework.ai.chat.prompt.Prompt(List.of(assistant)),
                    org.springframework.ai.model.tool.ToolCallingManager.builder().build());
            org.junit.jupiter.api.Assertions.assertFalse(body.toString().contains("suppressed"));
        } catch (java.io.IOException exception) {
            throw new AssertionError(exception);
        }
    }

    private StandardEnvironment environment() {
        var environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                "hertzbeat.agent.provider.protocol", "openai-responses",
                "hertzbeat.agent.provider.auth-mode", "none",
                "hertzbeat.agent.provider.model", "yaml-model",
                "hertzbeat.agent.provider.base-url", "http://localhost:1234/custom/v1")));
        return environment;
    }
}
