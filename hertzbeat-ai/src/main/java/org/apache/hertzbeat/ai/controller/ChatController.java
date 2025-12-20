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

package org.apache.hertzbeat.ai.controller;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.config.McpContextHolder;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.pojo.dto.ChatResponseChunk;
import org.apache.hertzbeat.ai.pojo.dto.SecurityData;
import org.apache.hertzbeat.ai.service.ConversationService;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import javax.validation.Valid;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import static org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE;

/**
 * Controller class for handling AI chat requests and conversation management.
 */
@Slf4j
@Tag(name = "AI Chat API")
@RestController
@RequestMapping(path = "/api/chat", produces = {APPLICATION_JSON_VALUE})
public class ChatController {

    private final ConversationService conversationService;

    @Autowired
    public ChatController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    /**
     * Send a message and get a streaming response with conversation tracking
     *
     * @param context The chat request context containing message and optional conversationId
     * @return Flux of ServerSentEvent for streaming response
     */
    @PostMapping(value = "/stream", produces = TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Send a chat message with streaming response", description = "Send a message to AI and get a streaming response with conversation tracking")
    public Flux<ServerSentEvent<ChatResponseChunk>> streamChat(@Valid @RequestBody ChatRequestContext context) {
        try {
            // Validate message is not empty
            SubjectSum subject = SurenessContextHolder.getBindSubject();
            McpContextHolder.setSubject(subject);
            if (context.getMessage() == null || context.getMessage().trim().isEmpty()) {
                ChatResponseChunk errorResponse = ChatResponseChunk.builder()
                    .conversationId(context.getConversationId())
                    .response("Error: Message cannot be empty")
                    .build();
                return Flux.just(ServerSentEvent.builder(errorResponse)
                    .event("error")
                    .build());
            }

            log.info("Received streaming chat request for conversation: {}", context.getConversationId());
            return conversationService.streamChat(context.getMessage(), context.getConversationId());

        } catch (Exception e) {
            log.error("Error in stream chat endpoint: ", e);
            ChatResponseChunk errorResponse = ChatResponseChunk.builder()
                .conversationId(context.getConversationId())
                .response("An error occurred: " + e.getMessage())
                .build();
            return Flux.just(ServerSentEvent.builder(errorResponse)
                .event("error")
                .build());
        }
    }

    /**
     * Create a new conversation
     *
     * @return Created conversation details
     */
    @PostMapping(path = "/conversations")
    @Operation(summary = "Create a new conversation", description = "Create a new conversation")
    public ResponseEntity<Message<ChatConversation>> createConversation() {
        ChatConversation conversation = conversationService.createConversation();
        return ResponseEntity.ok(Message.success(conversation));
    }

    /**
     * Get all conversations
     *
     * @return List of all conversations
     */
    @GetMapping(path = "/conversations")
    @Operation(summary = "List all conversations", description = "Get a list of all conversations")
    public ResponseEntity<Message<List<ChatConversation>>> listConversations() {
        List<ChatConversation> conversations = conversationService.getAllConversations();
        return ResponseEntity.ok(Message.success(conversations));
    }

    /**
     * Get conversation history
     *
     * @param conversationId The conversation ID
     * @return Conversation details with message history
     */
    @GetMapping(path = "/conversations/{conversationId}")
    @Operation(summary = "Get conversation history", description = "Get detailed information and message history for a specific conversation")
    public ResponseEntity<Message<ChatConversation>> getConversation(
        @Parameter(description = "Conversation ID", example = "12345678") @PathVariable(value = "conversationId") Long conversationId) {
        ChatConversation conversation = conversationService.getConversation(conversationId);
        return ResponseEntity.ok(Message.success(conversation));
    }

    /**
     * Delete a conversation
     *
     * @param conversationId The conversation ID to delete
     * @return Success or error message
     */
    @DeleteMapping(path = "/conversations/{conversationId}")
    @Operation(summary = "Delete conversation", description = "Delete a specific conversation and all its messages")
    public ResponseEntity<Message<Void>> deleteConversation(
        @Parameter(description = "Conversation ID", example = "2345678") @PathVariable("conversationId") Long conversationId) {
        conversationService.deleteConversation(conversationId);
        return ResponseEntity.ok(Message.success());
    }

    @PostMapping(path = "/security")
    @Operation(summary = "save security data", description = "Save security data")
    public ResponseEntity<Message<Boolean>> commitSecurityData(@Valid @RequestBody SecurityData securityData) {
        return ResponseEntity.ok(Message.success(conversationService.saveSecurityData(securityData)));
    }


}
