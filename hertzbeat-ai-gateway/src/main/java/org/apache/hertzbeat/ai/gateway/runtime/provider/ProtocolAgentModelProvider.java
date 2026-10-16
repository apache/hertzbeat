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

import org.apache.hertzbeat.ai.gateway.runtime.HertzBeatModel;
import org.apache.hertzbeat.ai.provider.ProtocolChatModelFactory;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.springframework.stereotype.Component;

import java.util.List;

/** Explicitly selected protocol connections; vendor presets remain optional helpers. */
@Component
public class ProtocolAgentModelProvider implements AgentModelProvider {
    private final ProtocolChatModelFactory factory;

    public ProtocolAgentModelProvider(ProtocolChatModelFactory factory) {
        this.factory = factory;
    }

    @Override
    public String type() {
        return "protocol";
    }

    @Override
    public List<AgentModelProviderOption> options() {
        return List.of(
                option("openai-chat", "OpenAI Chat Completions"),
                option("openai-responses", "OpenAI Responses"),
                option("anthropic-messages", "Anthropic Messages"));
    }

    private AgentModelProviderOption option(String code, String label) {
        return new AgentModelProviderOption(
                type(), code, label, null, null, List.of("name", "baseUrl", "model"));
    }

    @Override
    public HertzBeatModel createModel(ModelProviderConfig config) {
        if (config.getProtocol() == null) config.setProtocol(config.getCode());
        return new HertzBeatModel(factory.create(config, false));
    }
}
