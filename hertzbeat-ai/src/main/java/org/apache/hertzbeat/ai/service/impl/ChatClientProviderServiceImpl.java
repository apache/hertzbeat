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


package org.apache.hertzbeat.ai.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.ai.service.ChatClientProviderService;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.chat.prompt.SystemPromptTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;

/**
 * Implementation of the {@link ChatClientProviderService}.
 * Provides functionality to interact with the ChatClient for handling chat
 * messages.
 */
@Slf4j
@Service
public class ChatClientProviderServiceImpl implements ChatClientProviderService {

    private final ApplicationContext applicationContext;

    private final GeneralConfigDao generalConfigDao;
    
    @Autowired
    private ToolCallbackProvider toolCallbackProvider;
    
    private boolean isConfigured = false;

    @Value("classpath:/prompt/system-message.st")
    private Resource systemResource;

    @Autowired
    public ChatClientProviderServiceImpl(ApplicationContext applicationContext, GeneralConfigDao generalConfigDao) {
        this.applicationContext = applicationContext;
        this.generalConfigDao = generalConfigDao;
    }

    @Override
    public Flux<String> streamChat(ChatRequestContext context) {
        try {
            // Get the current (potentially refreshed) ChatClient instance
            ChatClient chatClient = applicationContext.getBean("openAiChatClient", ChatClient.class);
            
            List<Message> messages = new ArrayList<>();

            // Add conversation history if available
            if (context.getConversationHistory() != null && !context.getConversationHistory().isEmpty()) {
                for (ChatMessage historyMessage : context.getConversationHistory()) {
                    if ("user".equals(historyMessage.getRole())) {
                        messages.add(new UserMessage(historyMessage.getContent()));
                    } else if ("assistant".equals(historyMessage.getRole())) {
                        messages.add(new AssistantMessage(historyMessage.getContent()));
                    }
                }
            }

            messages.add(new UserMessage(context.getMessage()));

            log.info("Starting streaming chat for conversation: {}", context.getConversationId());

            return chatClient.prompt()
                    .messages(messages)
                    .system(SystemPromptTemplate.builder().resource(systemResource).build().getTemplate())
                    .toolCallbacks(toolCallbackProvider)
                    .stream()
                    .content()
                    .doOnComplete(() -> log.info("Streaming completed for conversation: {}", context.getConversationId()))
                    .doOnError(error -> log.error("Error in streaming chat: {}", error.getMessage(), error));

        } catch (Exception e) {
            log.error("Error setting up streaming chat: {}", e.getMessage(), e);
            return Flux.error(e);
        }
    }

    @Override
    public boolean isConfigured() {
        if (!isConfigured) {
            GeneralConfig providerConfig = generalConfigDao.findByType("provider");
            ModelProviderConfig modelProviderConfig = JsonUtil.fromJson(providerConfig.getContent(), ModelProviderConfig.class);
            isConfigured = modelProviderConfig != null && modelProviderConfig.getApiKey() != null;   
        }
        return isConfigured;
    }
}
