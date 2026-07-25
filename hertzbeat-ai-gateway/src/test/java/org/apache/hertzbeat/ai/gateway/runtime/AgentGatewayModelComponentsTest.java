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

import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProvider;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderRegistry;
import org.apache.hertzbeat.ai.gateway.runtime.provider.OpenAiCompatibleAgentModelProvider;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

/**
 * Test case for Agent runtime model components.
 */
class AgentGatewayModelComponentsTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(BindingConfig.class);

    @Test
    void runtimeWithoutModelCredentialsShouldCreateReloadableClient() {
        contextRunner.run(context -> {
            assertInstanceOf(ReloadableAgentRuntimeModelClient.class,
                    context.getBean(AgentRuntimeModelClient.class));
        });
    }

    @Test
    void runtimeCredentialsShouldCreateHertzBeatModel() {
        contextRunner.withPropertyValues(
            "hertzbeat.agent.provider.type=openai-compatible",
            "hertzbeat.agent.provider.code=openai",
            "hertzbeat.agent.provider.model=gpt-runtime",
            "hertzbeat.agent.provider.base-url=https://model.example.test/v1",
            "hertzbeat.agent.provider.api-key=runtime-secret")
            .run(context -> {
                ReloadableAgentRuntimeModelClient client = assertInstanceOf(ReloadableAgentRuntimeModelClient.class,
                    context.getBean(AgentRuntimeModelClient.class));
                assertNotNull(client.currentModel());
            });
    }

    @Test
    void customProviderShouldCreateHertzBeatModelThroughRegistry() {
        contextRunner.withUserConfiguration(CustomProviderConfig.class)
            .withPropertyValues(
                "hertzbeat.agent.provider.type=custom-provider",
                "hertzbeat.agent.provider.code=custom-preset",
                "hertzbeat.agent.provider.model=custom-model")
            .run(context -> {
                ReloadableAgentRuntimeModelClient client = assertInstanceOf(ReloadableAgentRuntimeModelClient.class,
                    context.getBean(AgentRuntimeModelClient.class));
                assertInstanceOf(CustomHertzBeatModel.class, client.currentModel());
            });
    }

    @EnableConfigurationProperties({AgentProviderProperties.class, AgentRuntimeProperties.class})
    @Import({
        OpenAiCompatibleAgentModelProvider.class,
        AgentModelProviderRegistry.class,
        ReloadableAgentRuntimeModelClient.class
    })
    static class BindingConfig {

        @Bean
        GeneralConfigDao generalConfigDao() {
            return mock(GeneralConfigDao.class);
        }
    }

    static class CustomProviderConfig {

        @Bean
        AgentModelProvider customProvider() {
            return new CustomProvider();
        }
    }

    private static final class CustomProvider implements AgentModelProvider {

        @Override
        public String type() {
            return "custom-provider";
        }

        @Override
        public HertzBeatModel createModel(ModelProviderConfig config) {
            return new CustomHertzBeatModel();
        }
    }

    private static final class CustomHertzBeatModel extends HertzBeatModel {

        private CustomHertzBeatModel() {
            super(mock(ChatModel.class));
        }
    }
}
