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

package org.apache.hertzbeat.ai.agent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.agent.pojo.dto.ConversationDto;
import org.apache.hertzbeat.ai.agent.service.ConversationService;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import javax.validation.Valid;
import java.util.HashMap;
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
     * Create a new conversation
     * 
     * @return Created conversation details
     */
    @PostMapping(path = "/conversations")
    @Operation(summary = "Create a new conversation", description = "Create a new conversation")
    public ResponseEntity<Message<ConversationDto>> createConversation() {
        try {
            ConversationDto conversation = conversationService.createConversation();
            return ResponseEntity.ok(Message.success(conversation));
        } catch (Exception e) {
            log.error("Error creating conversation: ", e);
            return ResponseEntity.ok(Message.fail((byte) -1, "Failed to create conversation"));
        }
    }
    
    /**
     * Send a message and get a streaming response with conversation tracking
     * 
     * @param context The chat request context containing message and optional conversationId
     * @return SSE emitter for streaming response
     */
    @PostMapping(value = "/stream", produces = TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Send a chat message with streaming response", description = "Send a message to AI and get a streaming response with conversation tracking")
    public SseEmitter streamChat(@Valid @RequestBody ChatRequestContext context) {
        try {
            // Validate message is not empty
            if (context.getMessage() == null || context.getMessage().trim().isEmpty()) {
                SseEmitter emitter = new SseEmitter();
                try {
                    emitter.send("Error: Message cannot be empty");
                    emitter.complete();
                } catch (Exception sendError) {
                    emitter.completeWithError(sendError);
                }
                return emitter;
            }
            
            return conversationService.streamChat(context.getMessage(), context.getConversationId());
        } catch (Exception e) {
            log.error("Error in stream chat endpoint: ", e);
            SseEmitter emitter = new SseEmitter();
            emitter.completeWithError(e);
            return emitter;
        }
    }
    
    /**
     * Get all conversations
     * 
     * @return List of all conversations
     */
    @GetMapping(path = "/conversations")
    @Operation(summary = "List all conversations", description = "Get a list of all conversations")
    public ResponseEntity<Message<List<ConversationDto>>> listConversations() {
        try {
            List<ConversationDto> conversations = conversationService.getAllConversations();
            return ResponseEntity.ok(Message.success(conversations));
        } catch (Exception e) {
            log.error("Error listing conversations: ", e);
            return ResponseEntity.ok(Message.fail((byte) -1, "Failed to retrieve conversations"));
        }
    }
    
    /**
     * Get conversation history
     * 
     * @param conversationId The conversation ID
     * @return Conversation details with message history
     */
    @GetMapping(path = "/conversations/{conversationId}")
    @Operation(summary = "Get conversation history", description = "Get detailed information and message history for a specific conversation")
    public ResponseEntity<Message<ConversationDto>> getConversation(
            @Parameter(description = "Conversation ID", example = "conv-12345678") @PathVariable("conversationId") String conversationId) {
        try {
            // Validate conversation ID
            if (conversationId == null || conversationId.trim().isEmpty()) {
                return ResponseEntity.ok(Message.fail((byte) -1, "Conversation ID is required"));
            }
            
            ConversationDto conversation = conversationService.getConversation(conversationId);
            
            if (conversation == null) {
                return ResponseEntity.ok(Message.fail((byte) -1, "Conversation not found: " + conversationId));
            }
            
            return ResponseEntity.ok(Message.success(conversation));
            
        } catch (Exception e) {
            log.error("Error getting conversation: ", e);
            return ResponseEntity.ok(Message.fail((byte) -1, "Failed to retrieve conversation"));
        }
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
            @Parameter(description = "Conversation ID", example = "conv-12345678") @PathVariable("conversationId") String conversationId) {
        try {
            // Validate conversation ID
            if (conversationId == null || conversationId.trim().isEmpty()) {
                return ResponseEntity.ok(Message.fail((byte) -1, "Conversation ID is required"));
            }
            
            boolean deleted = conversationService.deleteConversation(conversationId);
            if (!deleted) {
                return ResponseEntity.ok(Message.fail((byte) -1, "Conversation not found: " + conversationId));
            }
            
            return ResponseEntity.ok(Message.success("Conversation deleted successfully"));
        } catch (Exception e) {
            log.error("Error deleting conversation: ", e);
            return ResponseEntity.ok(Message.fail((byte) -1, "Failed to delete conversation"));
        }
    }
}
