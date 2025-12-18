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
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.ai.dao.ChatMessageDao;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.pojo.dto.ChatResponseChunk;
import org.apache.hertzbeat.ai.service.ChatClientProviderService;
import org.apache.hertzbeat.ai.service.ConversationService;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.ai.ChatMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import reactor.core.publisher.Flux;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Implementation of the ConversationService interface for managing chat conversations.
 */
@Slf4j
@Service
public class ConversationServiceImpl implements ConversationService {

    @Autowired
    private ChatConversationDao conversationDao;

    @Autowired
    private ChatMessageDao messageDao;

    @Autowired
    private ChatClientProviderService chatClientProviderService;

    @Override
    public Flux<ServerSentEvent<ChatResponseChunk>> streamChat(String message, Long conversationId) {

        // Check if provider is properly configured
        if (!chatClientProviderService.isConfigured()) {
            ChatResponseChunk errorResponse = ChatResponseChunk.builder()
                    .conversationId(conversationId)
                    .response("Provider is not configured. Please configure your AI Provider.")
                    .build();
            return Flux.just(ServerSentEvent.builder(errorResponse)
                    .event("error")
                    .build());
        }

        log.info("Starting streaming conversation: {}", conversationId);
        ChatConversation conversation = conversationDao.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        // Manually load messages for conversation history
        List<ChatMessage> messages = messageDao.findByConversationIdOrderByGmtCreateAsc(conversationId);
        conversation.setMessages(messages);

        if (conversation.getTitle().startsWith("conversation")) {
            // Auto-generate title from first user message
            String title = message.length() > 30 ? message.substring(0, 27) + "..." : message;
            conversation.setTitle(title);
            conversationDao.save(conversation);
        }

        // Add user message to conversation
        ChatMessage chatMessage = ChatMessage.builder()
            .conversationId(conversationId)
            .content(message)
            .role("user")
            .build();
        chatMessage = messageDao.save(chatMessage);

        ChatRequestContext context = ChatRequestContext.builder()
                .message(message)
                .conversationId(conversationId)
                .conversationHistory(CollectionUtils.isEmpty(conversation.getMessages()) ? null
                        : conversation.getMessages().subList(0, conversation.getMessages().size() - 1))
                .build();

        // Stream response from AI service
        StringBuilder fullResponse = new StringBuilder();
        ChatMessage finalChatMessage = chatMessage;
        return chatClientProviderService.streamChat(context)
                .map(chunk -> {
                    fullResponse.append(chunk);
                    ChatResponseChunk responseChunk = ChatResponseChunk.builder()
                            .conversationId(conversationId)
                            .userMessageId(finalChatMessage.getId())
                            .response(chunk)
                            .build();

                    return ServerSentEvent.builder(responseChunk)
                            .event("message")
                            .build();
                })
                .concatWith(Flux.defer(() -> {
                    // Add the complete AI response to conversation
                    ChatMessage assistantMessage = ChatMessage.builder()
                        .conversationId(conversationId)
                        .content(fullResponse.toString())
                        .role("assistant")
                        .build();
                    assistantMessage = messageDao.save(assistantMessage);
                    ChatResponseChunk finalResponse = ChatResponseChunk.builder()
                            .conversationId(conversationId)
                            .response("")
                            .assistantMessageId(assistantMessage.getId())
                            .build();

                    return Flux.just(ServerSentEvent.builder(finalResponse)
                            .event("complete")
                            .build());
                }))
                .doOnComplete(() -> log.info("Streaming completed for conversation: {}", conversationId))
                .doOnError(error -> log.error("Error in streaming chat for conversation {}: {}", conversationId, error.getMessage(), error))
                .onErrorResume(error -> {
                    ChatResponseChunk errorResponse = ChatResponseChunk.builder()
                            .conversationId(conversationId)
                            .response("An error occurred: " + error.getMessage())
                            .userMessageId(finalChatMessage.getId())
                            .build();
                    return Flux.just(ServerSentEvent.builder(errorResponse)
                            .event("error")
                            .build());
                });
    }

    @Override
    public ChatConversation createConversation() {
        ChatConversation conversation = new ChatConversation();
        conversation.setTitle("conversation-" + UUID.randomUUID().toString().substring(0, 4));
        return conversationDao.save(conversation);
    }

    @Override
    public ChatConversation getConversation(Long conversationId) {
        if (conversationId == null) {
            return null;
        }
        ChatConversation conversation = conversationDao.findById(conversationId).orElse(null);
        if (conversation != null) {
            List<ChatMessage> messages = messageDao.findByConversationIdOrderByGmtCreateAsc(conversationId);
            conversation.setMessages(messages);
        }
        return conversation;
    }

    @Override
    public List<ChatConversation> getAllConversations() {
        List<ChatConversation> conversations = conversationDao.findAll(Sort.by(Sort.Direction.DESC, "id"));
        if (conversations.isEmpty()) {
            return conversations;
        }
        List<Long> conversationIds = conversations.stream()
                .map(ChatConversation::getId)
                .toList();
        List<ChatMessage> allMessages = messageDao.findByConversationIdInOrderByGmtCreateAsc(conversationIds);
        Map<Long, List<ChatMessage>> messagesByConversationId = allMessages.stream()
                .collect(Collectors.groupingBy(ChatMessage::getConversationId));
        for (ChatConversation conversation : conversations) {
            List<ChatMessage> messages = messagesByConversationId.getOrDefault(conversation.getId(), Collections.emptyList());
            conversation.setMessages(messages);
        }
        return conversations;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteConversation(Long conversationId) {
        List<ChatMessage> messages = messageDao.findByConversationIdOrderByGmtCreateAsc(conversationId);
        if (!messages.isEmpty()) {
            messageDao.deleteAll(messages);
        }
        conversationDao.deleteById(conversationId);
    }
}
