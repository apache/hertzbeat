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


package org.apache.hertzbeat.ai.agent.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.config.PromptProvider;
import org.apache.hertzbeat.ai.agent.pojo.dto.MessageDto;
import org.apache.hertzbeat.ai.agent.service.ChatClientProviderService;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.agent.pojo.dto.ChatRequestContext;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
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

    private final ChatClient chatClient;

    @Qualifier("hertzbeatTools")
    @Autowired
    private ToolCallbackProvider toolCallbackProvider;

    @Autowired
    public ChatClientProviderServiceImpl(ChatClient openAiChatClient) {
        this.chatClient = openAiChatClient;
    }

    public String complete(String message) {
        return this.chatClient.prompt()
                .user(message)
                .call()
                .content();
    }

    @Override
    public Flux<String> streamChat(ChatRequestContext context) {
        try {
            List<Message> messages = new ArrayList<>();

            // Add conversation history if available
            if (context.getConversationHistory() != null && !context.getConversationHistory().isEmpty()) {
                for (MessageDto historyMessage : context.getConversationHistory()) {
                    if ("user".equals(historyMessage.getRole())) {
                        messages.add(new UserMessage(historyMessage.getContent()));
                    } else if ("assistant".equals(historyMessage.getRole())) {
                        messages.add(new AssistantMessage(historyMessage.getContent()));
                    }
                }
            }

            messages.add(new UserMessage(context.getMessage()));

            log.info("Starting streaming chat for conversation: {}", context.getConversationId());

            return this.chatClient.prompt()
                    .messages(messages)
                    .system(PromptProvider.HERTZBEAT_SYSTEM_PROMPT)
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
}