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
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopParameter;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.ai.service.ChatClientProviderService;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationContext;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
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

    private static final String SKILLS_PLACEHOLDER = "{dynamically_injected_skills_list}";

    private final ApplicationContext applicationContext;

    private final GeneralConfigDao generalConfigDao;

    private final SkillRegistry skillRegistry;
    
    @Autowired
    @Qualifier("hertzbeatTools")
    private ToolCallbackProvider toolCallbackProvider;
    
    private boolean isConfigured = false;

    @Value("classpath:/prompt/system-message.st")
    private Resource systemResource;

    @Autowired
    public ChatClientProviderServiceImpl(ApplicationContext applicationContext, 
                                         GeneralConfigDao generalConfigDao,
                                         @Lazy SkillRegistry skillRegistry) {
        this.applicationContext = applicationContext;
        this.generalConfigDao = generalConfigDao;
        this.skillRegistry = skillRegistry;
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

            // Build system prompt with dynamic skills list
            String systemPrompt = buildSystemPrompt();

            return chatClient.prompt()
                    .messages(messages)
                    .system(systemPrompt)
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

    /**
     * Build the system prompt with dynamically injected skills list.
     */
    private String buildSystemPrompt() {
        try {
            String template = systemResource.getContentAsString(StandardCharsets.UTF_8);
            String skillsList = generateSkillsList();
            return template.replace(SKILLS_PLACEHOLDER, skillsList);
        } catch (IOException e) {
            log.error("Failed to read system prompt template: {}", e.getMessage());
            return "";
        }
    }

    /**
     * Generate a formatted list of available skills for the system prompt.
     */
    private String generateSkillsList() {
        List<SopDefinition> skills = skillRegistry.getAllSkills();
        
        if (skills.isEmpty()) {
            return "No skills currently available. Use listSkills tool to refresh.";
        }
        
        StringBuilder sb = new StringBuilder();
        for (SopDefinition skill : skills) {
            sb.append("- **").append(skill.getName()).append("**: ");
            sb.append(skill.getDescription());
            
            // Add parameter hints
            if (skill.getParameters() != null && !skill.getParameters().isEmpty()) {
                sb.append(" (requires: ");
                List<String> paramNames = new ArrayList<>();
                for (SopParameter param : skill.getParameters()) {
                    if (param.isRequired()) {
                        paramNames.add(param.getName());
                    }
                }
                sb.append(String.join(", ", paramNames));
                sb.append(")");
            }
            sb.append("\n");
        }
        
        return sb.toString();
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
