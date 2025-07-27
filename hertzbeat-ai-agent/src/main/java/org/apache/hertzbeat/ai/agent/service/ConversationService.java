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


import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

/**
 * Service for managing chat conversations and interactions with LLM providers.
 */
public interface ConversationService {

    /**
     * Send a message and receive a streaming response
     *
     * @param message The user's message
     * @param conversationId Optional conversation ID for continuing a chat
     * @return SseEmitter for streaming the response
     */
    SseEmitter streamChat(String message, String conversationId);

    /**
     * Send a message and get a complete response
     *
     * @param message The user's message
     * @param conversationId Optional conversation ID for continuing a chat
     * @return Response object containing the AI's response and conversation metadata
     */
    Map<String, Object> chat(String message, String conversationId);

    /**
     * Get conversation history for a specific conversation
     *
     * @param conversationId Conversation ID
     * @return Conversation data including messages
     */
    Map<String, Object> getConversation(String conversationId);

    /**
     * Get all conversations for the current user
     *
     * @return List of conversations
     */
    List<Map<String, Object>> getAllConversations();

    /**
     * Delete a conversation
     *
     * @param conversationId Conversation ID to delete
     */
    void deleteConversation(String conversationId);
}
