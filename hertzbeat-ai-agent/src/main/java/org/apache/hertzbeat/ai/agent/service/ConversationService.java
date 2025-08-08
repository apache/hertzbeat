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


package org.apache.hertzbeat.ai.agent.service;

import org.apache.hertzbeat.ai.agent.pojo.dto.ConversationDto;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

/**
 * Service for managing chat conversations and interactions with LLM providers.
 */
public interface ConversationService {

    /**
     * Create a new conversation
     *
     * @return Created conversation data
     */
    ConversationDto createConversation();

    /**
     * Send a message and receive a streaming response
     *
     * @param message The user's message
     * @param conversationId Optional conversation ID for continuing a chat
     * @return SseEmitter for streaming the response
     */
    SseEmitter streamChat(String message, String conversationId);


    /**
     * Get conversation history for a specific conversation
     *
     * @param conversationId Conversation ID
     * @return Conversation data including messages
     */
    ConversationDto getConversation(String conversationId);

    /**
     * Get all conversations for the current user
     *
     * @return List of conversations
     */
    List<ConversationDto> getAllConversations();

    /**
     * Delete a conversation
     *
     * @param conversationId Conversation ID to delete
     * @return true if deleted, false if conversation not found
     */
    boolean deleteConversation(String conversationId);
    
    /**
     * Check if a conversation exists
     *
     * @param conversationId Conversation ID to check
     * @return true if conversation exists, false otherwise
     */
    boolean conversationExists(String conversationId);
}
