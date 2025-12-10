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


package org.apache.hertzbeat.ai.service;

import org.apache.hertzbeat.ai.pojo.dto.ChatResponseChunk;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

import java.util.List;

/**
 * Service for managing chat conversations and interactions with LLM providers.
 */
public interface ConversationService {

    /**
     * Send a message and receive a streaming response
     *
     * @param message The user's message
     * @param conversationId Optional conversation ID for continuing a chat
     * @return Flux of ServerSentEvent for streaming the response
     */
    Flux<ServerSentEvent<ChatResponseChunk>> streamChat(String message, Long conversationId);

    /**
     * Create a new conversation
     *
     * @return Created conversation data
     */
    ChatConversation createConversation();

    /**
     * Get conversation history for a specific conversation
     *
     * @param conversationId Conversation ID
     * @return Conversation data including messages
     */
    ChatConversation getConversation(Long conversationId);

    /**
     * Get all conversations for the current user
     *
     * @return List of conversations
     */
    List<ChatConversation> getAllConversations();

    /**
     * Delete a conversation
     *
     * @param conversationId Conversation ID to delete
     */
    void deleteConversation(Long conversationId);
}
