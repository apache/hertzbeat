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


package org.apache.hertzbeat.ai.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.support.event.AiProviderConfigChangeEvent;
import org.apache.hertzbeat.ai.pojo.dto.ModelProviderConfig;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

/**
 * Configuration class for Large Language Model (LLM) settings.
 */

@Configuration
@Slf4j
public class LlmConfig {

    private final GeneralConfigDao generalConfigDao;
    
    private ApplicationContext applicationContext;

    public LlmConfig(GeneralConfigDao generalConfigDao, ApplicationContext applicationContext) {
        this.generalConfigDao = generalConfigDao;
        this.applicationContext = applicationContext;
    }

    /**
     * Create ChatClient bean with all dependencies created internally
     */
    @Bean
    public ChatClient openAiChatClient() {
        return createChatClient();
    }

    /**
     * Create ChatClient with all necessary components
     */
    private ChatClient createChatClient() {

        GeneralConfig providerConfig = generalConfigDao.findByType("provider");
        if (providerConfig == null || providerConfig.getContent() == null) {
            log.warn("LLM Provider is not set, ChatClient bean will not be created");
            return null;
        }
        ModelProviderConfig modelProviderConfig = JsonUtil.fromJson(providerConfig.getContent(), ModelProviderConfig.class);

        if (!modelProviderConfig.isEnable() || !modelProviderConfig.isStatus()) {
            log.warn("LLM Provider is not enabled or status is not valid, ChatClient bean will not be created");
            return null;
        }

        if (modelProviderConfig.getApiKey() == null) {
            log.warn("LLM Provider configuration is incomplete, ChatClient bean will not be created");
            return null;
        }

        if (modelProviderConfig.getBaseUrl() == null) {
            if ("openai".equals(modelProviderConfig.getCode())) {
                modelProviderConfig.setBaseUrl("https://api.openai.com/v1");
            } else if ("zhipu".equals(modelProviderConfig.getCode())) {
                modelProviderConfig.setBaseUrl("https://open.bigmodel.cn/api/paas/v4");
            } else if ("zai".equals(modelProviderConfig.getCode())) {
                modelProviderConfig.setBaseUrl("https://api.z.ai/api/paas/v4");
            } else {
                modelProviderConfig.setBaseUrl("https://api.openai.com/v1");
            }
        }
        
        if (modelProviderConfig.getModel() == null) {
            if ("openai".equals(modelProviderConfig.getCode())) {
                modelProviderConfig.setModel("gpt-5");
            } else if ("zhipu".equals(modelProviderConfig.getCode())) {
                modelProviderConfig.setModel("glm-4.6");
            } else if ("zai".equals(modelProviderConfig.getCode())) {
                modelProviderConfig.setModel("glm-4.6");
            } else {
                modelProviderConfig.setModel("gpt-5");
            }
        }

        OpenAiApi.Builder builder = new OpenAiApi.Builder();
        builder.baseUrl(modelProviderConfig.getBaseUrl());
        builder.apiKey(modelProviderConfig.getApiKey());
        builder.completionsPath("/chat/completions");
        
        // Create Chat Options
        OpenAiChatOptions openAiChatOptions = OpenAiChatOptions.builder()
                .model(modelProviderConfig.getModel())
                .temperature(0.3)
                .build();
        
        // Create Chat Model
        OpenAiChatModel openAiChatModel = OpenAiChatModel.builder()
                .openAiApi(builder.build())
                .defaultOptions(openAiChatOptions)
                .build();
        
        // Create and return ChatClient
        return ChatClient.create(openAiChatModel);
    }

    /**
     * AI configuration change event listener
     * Uses ApplicationContext to unregister and re-register the ChatClient bean
     */
    @EventListener(AiProviderConfigChangeEvent.class)
    public void onAiProviderConfigChange(AiProviderConfigChangeEvent event) {
        log.info("Provider configuration change event received, refreshing ChatClient bean");
        
        try {
            ConfigurableApplicationContext configurableContext = (ConfigurableApplicationContext) applicationContext;
            DefaultListableBeanFactory beanFactory = (DefaultListableBeanFactory) configurableContext.getBeanFactory();
            
            // Remove the existing ChatClient bean
            if (beanFactory.containsSingleton("openAiChatClient")) {
                beanFactory.destroySingleton("openAiChatClient");
                log.info("Existing ChatClient bean destroyed");
            }
                        
            // Create new ChatClient with updated configuration
            ChatClient newChatClient = createChatClient();
            
            // Register the new ChatClient bean
            beanFactory.registerSingleton("openAiChatClient", newChatClient);
            
            log.info("ChatClient bean refreshed successfully with new AI provider configuration");
            
        } catch (Exception e) {
            log.error("Failed to refresh ChatClient bean after configuration change", e);
        }
    }

}
