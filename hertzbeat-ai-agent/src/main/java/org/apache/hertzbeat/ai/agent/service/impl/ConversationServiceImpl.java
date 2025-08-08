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
import org.apache.hertzbeat.ai.agent.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.agent.pojo.dto.ConversationDto;
import org.apache.hertzbeat.ai.agent.pojo.dto.MessageDto;
import org.apache.hertzbeat.ai.agent.service.ChatClientProviderService;
import org.apache.hertzbeat.ai.agent.service.ConversationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Implementation of the ConversationService interface for managing chat conversations.
 */
@Slf4j
@Service
public class ConversationServiceImpl implements ConversationService {
    
    private final Map<String, Map<String, Object>> conversations = new ConcurrentHashMap<>();
    private final Map<String, List<Map<String, Object>>> conversationMessages = new ConcurrentHashMap<>();
    
    @Autowired
    private ChatClientProviderService chatClientProviderService;
    
    @Override
    public ConversationDto createConversation() {
        String conversationId = createNewConversation();
        return getConversation(conversationId);
    }
    
    @Override
    public SseEmitter streamChat(String message, String conversationId) {
        SseEmitter emitter = new SseEmitter(30000L);
        
        if (!conversationExists(conversationId)) {
            try {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Conversation not found: " + conversationId);
                emitter.send(errorResponse);
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }
        new Thread(() -> {
            try {
                log.info("Starting conversation: {}", conversationId);
                addMessageToConversation(conversationId, message, "user");
                
                ChatRequestContext context = new ChatRequestContext(message, conversationId);
                String aiResponse = chatClientProviderService.streamChat(context);
                
                addMessageToConversation(conversationId, aiResponse, "assistant");
                
                Map<String, Object> response = new HashMap<>();
                response.put("conversationId", conversationId);
                response.put("response", aiResponse);
                response.put("timestamp", LocalDateTime.now().toString());
                
                emitter.send(response);
                emitter.complete();
                
            } catch (Exception e) {
                log.error("Error in stream chat: ", e);
                try {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "An error occurred: " + e.getMessage());
                    emitter.send(errorResponse);
                } catch (Exception sendError) {
                    log.error("Error sending error response: ", sendError);
                }
                emitter.completeWithError(e);
            }
        }).start();
        
        return emitter;
    }

    @Override
    public ConversationDto getConversation(String conversationId) {
        if (conversationId == null || conversationId.isEmpty()) {
            return null;
        }
        
        Map<String, Object> conversation = conversations.get(conversationId);
        if (conversation == null) {
            return null;
        }
        
        List<Map<String, Object>> messagesList = conversationMessages.get(conversationId);
        List<MessageDto> messages = messagesList != null
            ? messagesList.stream().map(this::mapToMessageDto).collect(Collectors.toList()) :
            new ArrayList<>();
            
        return ConversationDto.builder()
                .conversationId((String) conversation.get("conversationId"))
                .createdAt((LocalDateTime) conversation.get("createdAt"))
                .updatedAt((LocalDateTime) conversation.get("updatedAt"))
                .messages(messages)
                .build();
    }
    
    @Override
    public List<ConversationDto> getAllConversations() {
        List<ConversationDto> result = new ArrayList<>();
        
        for (Map.Entry<String, Map<String, Object>> entry : conversations.entrySet()) {
            Map<String, Object> conv = entry.getValue();
            List<Map<String, Object>> messages = conversationMessages.get(entry.getKey());
            
            ConversationDto dto = ConversationDto.builder()
                    .conversationId((String) conv.get("conversationId"))
                    .createdAt((LocalDateTime) conv.get("createdAt"))
                    .updatedAt((LocalDateTime) conv.get("updatedAt"))
                    .messages(new ArrayList<>()) // Don't include messages in list view for performance
                    .build();
            result.add(dto);
        }
        
        result.sort((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()));
        
        return result;
    }
    
    @Override
    public boolean deleteConversation(String conversationId) {
        if (conversationId == null || conversationId.isEmpty()) {
            return false;
        }
        
        boolean existed = conversations.containsKey(conversationId);
        if (existed) {
            conversations.remove(conversationId);
            conversationMessages.remove(conversationId);
            log.info("Deleted conversation: {}", conversationId);
        }
        return existed;
    }
    
    @Override
    public boolean conversationExists(String conversationId) {
        return conversationId != null && !conversationId.isEmpty() && conversations.containsKey(conversationId);
    }
    
    private String createNewConversation() {
        String conversationId = "conv-" + UUID.randomUUID().toString().substring(0, 8);
        LocalDateTime now = LocalDateTime.now();
        
        Map<String, Object> conversation = new HashMap<>();
        conversation.put("conversationId", conversationId);
        conversation.put("createdAt", now);
        conversation.put("updatedAt", now);
        
        conversations.put(conversationId, conversation);
        conversationMessages.put(conversationId, new ArrayList<>());
        
        log.info("Created new conversation: {}", conversationId);
        return conversationId;
    }
    
    private MessageDto mapToMessageDto(Map<String, Object> messageMap) {
        return MessageDto.builder()
                .messageId((String) messageMap.get("messageId"))
                .conversationId((String) messageMap.get("conversationId"))
                .content((String) messageMap.get("content"))
                .role((String) messageMap.get("role"))
                .timestamp((LocalDateTime) messageMap.get("timestamp"))
                .build();
    }
    
    private void addMessageToConversation(String conversationId, String content, String role) {
        List<Map<String, Object>> messages = conversationMessages.computeIfAbsent(conversationId, k -> new ArrayList<>());
        
        Map<String, Object> message = new HashMap<>();
        message.put("messageId", "msg-" + UUID.randomUUID().toString().substring(0, 8));
        message.put("conversationId", conversationId);
        message.put("content", content);
        message.put("role", role);
        message.put("timestamp", LocalDateTime.now());
        
        messages.add(message);
        
        // Update conversation timestamp
        Map<String, Object> conversation = conversations.get(conversationId);
        if (conversation != null) {
            conversation.put("updatedAt", LocalDateTime.now());
            // Auto-generate title from first user message
            if ("user".equals(role) && messages.stream().filter(m -> "user".equals(m.get("role"))).count() == 1) {
                String title = content.length() > 30 ? content.substring(0, 27) + "..." : content;
                conversation.put("title", title);
            }
        }
    }



}
