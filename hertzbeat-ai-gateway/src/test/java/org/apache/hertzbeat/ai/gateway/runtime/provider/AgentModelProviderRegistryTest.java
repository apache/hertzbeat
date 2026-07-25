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

package org.apache.hertzbeat.ai.gateway.runtime.provider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.runtime.HertzBeatModel;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AgentModelProviderRegistry}.
 */
class AgentModelProviderRegistryTest {

    @Test
    void legacyBlankTypeShouldResolveToOpenAiCompatibleProvider() {
        AgentModelProviderRegistry registry = registry("openai-compatible", mock(HertzBeatModel.class));

        assertEquals("openai-compatible", registry.resolveType(config(null)));
    }

    @Test
    void explicitProviderTypeShouldBeNormalizedAndSelectMatchingProvider() {
        HertzBeatModel expected = mock(HertzBeatModel.class);
        AgentModelProviderRegistry registry = registry("anthropic", expected);

        assertSame(expected, registry.createModel(config(" ANTHROPIC ")));
    }

    @Test
    void unsupportedAndDuplicateProviderTypesShouldFailFast() {
        AgentModelProviderRegistry registry = registry("openai-compatible", mock(HertzBeatModel.class));

        assertThrows(IllegalArgumentException.class, () -> registry.createModel(config("ollama")));
        assertThrows(IllegalArgumentException.class, () -> new AgentModelProviderRegistry(List.of(
                provider("ollama", mock(HertzBeatModel.class)),
                provider("OLLAMA", mock(HertzBeatModel.class)))));
    }

    private AgentModelProviderRegistry registry(String type, HertzBeatModel model) {
        return new AgentModelProviderRegistry(List.of(provider(type, model)));
    }

    private AgentModelProvider provider(String type, HertzBeatModel model) {
        return new AgentModelProvider() {
            @Override
            public String type() {
                return type;
            }

            @Override
            public HertzBeatModel createModel(ModelProviderConfig config) {
                return model;
            }
        };
    }

    private ModelProviderConfig config(String type) {
        ModelProviderConfig config = new ModelProviderConfig();
        config.setType(type);
        return config;
    }
}
