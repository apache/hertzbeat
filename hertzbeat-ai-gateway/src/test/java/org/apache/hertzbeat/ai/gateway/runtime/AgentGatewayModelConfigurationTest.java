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

package org.apache.hertzbeat.ai.gateway.runtime;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;

/**
 * Test case for {@link AgentGatewayModelConfiguration}.
 */
class AgentGatewayModelConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(BindingConfig.class, AgentGatewayModelConfiguration.class);

    @Test
    void runtimeWithoutModelCredentialsShouldCreateReloadableClient() {
        contextRunner.run(context -> {
            assertInstanceOf(ReloadableAgentRuntimeModelClient.class,
                    context.getBean(AgentRuntimeModelClient.class));
        });
    }

    @Test
    void runtimeCredentialsShouldCreateChatModelAndRuntimeModelClient() {
        contextRunner.withPropertyValues(
            "hertzbeat.agent.gateway.runtime.provider=openai-compatible",
            "hertzbeat.agent.gateway.runtime.model=gpt-runtime",
            "hertzbeat.agent.gateway.runtime.base-url=https://model.example.test/v1",
            "hertzbeat.agent.gateway.runtime.api-key=runtime-secret")
            .run(context -> {
                ReloadableAgentRuntimeModelClient client = assertInstanceOf(ReloadableAgentRuntimeModelClient.class,
                    context.getBean(AgentRuntimeModelClient.class));
                assertNotNull(client.currentClient());
            });
    }

    @Test
    void existingChatModelShouldCreateRuntimeModelClientWithoutOpenAiRuntimeCredentials() {
        contextRunner.withUserConfiguration(ExistingChatModelConfig.class)
            .withPropertyValues("hertzbeat.agent.gateway.runtime.model=gpt-runtime")
            .run(context -> {
                assertInstanceOf(ExistingChatModel.class, context.getBean(ChatModel.class));
                ReloadableAgentRuntimeModelClient client = assertInstanceOf(ReloadableAgentRuntimeModelClient.class,
                    context.getBean(AgentRuntimeModelClient.class));
                assertNotNull(client.currentClient());
            });
    }

    @EnableConfigurationProperties(AgentRuntimeProperties.class)
    static class BindingConfig {

        @Bean
        GeneralConfigDao generalConfigDao() {
            return mock(GeneralConfigDao.class);
        }
    }

    static class ExistingChatModelConfig {

        @Bean
        ChatModel existingChatModel() {
            return new ExistingChatModel();
        }
    }

    private static final class ExistingChatModel implements ChatModel {

        @Override
        public ChatResponse call(Prompt prompt) {
            return null;
        }
    }
}
