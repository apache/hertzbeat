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

import org.apache.hertzbeat.ai.agent.config.PromptProvider;
import org.apache.hertzbeat.ai.agent.service.ChatClientProviderService;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.agent.pojo.dto.ChatRequestContext;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;

/**
 * Implementation of the {@link ChatClientProviderService}.
 * Provides functionality to interact with the ChatClient for handling chat
 * messages.
 */
@Service
public class ChatClientProviderServiceImpl implements ChatClientProviderService {

    private final ChatClient chatClient;

    @Qualifier("hertzbeatTools")
    @Autowired
    private ToolCallbackProvider toolCallbackProvider;

    @Autowired
    public ChatClientProviderServiceImpl(@Qualifier("openAiChatClient") ChatClient openAiChatClient) {
        this.chatClient = openAiChatClient;
    }

    @Override
    public String streamChat(ChatRequestContext context) {
        try {
            return this.chatClient.prompt()
                    .user(context.getMessage())
                    .toolCallbacks(toolCallbackProvider)
                    .call()
                    .content();
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }

    }
}
