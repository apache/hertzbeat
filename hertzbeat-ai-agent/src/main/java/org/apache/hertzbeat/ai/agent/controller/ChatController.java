package org.apache.hertzbeat.ai.agent.controller;

import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.ai.agent.service.ConversationService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Controller class for handling chat-related HTTP requests.
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ConversationService conversationService;

    /**
     * Send a message and get a streaming response
     * @param message The user's message
     * @param conversationId Optional conversation ID for continuing a chat
     * @return SSE emitter for streaming response
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(@RequestParam String message,
                                 @RequestParam(required = false) String conversationId) {
        return conversationService.streamChat(message, conversationId);
    }

    /**
     * Send a message and get a complete response
     * @param message The user's message
     * @param conversationId Optional conversation ID for continuing a chat
     * @return Complete chat response
     */
    @PostMapping
    public ResponseEntity<?> chat(@RequestParam String message,
                                  @RequestParam(required = false) String conversationId) {
        return ResponseEntity.ok(conversationService.chat(message, conversationId));
    }

    /**
     * Get conversation history
     * @param conversationId Conversation ID
     * @return Conversation history
     */
    @GetMapping("/{conversationId}")
    public ResponseEntity<?> getConversation(@PathVariable String conversationId) {
        return ResponseEntity.ok(conversationService.getConversation(conversationId));
    }

    /**
     * Get all conversations for current user
     * @return List of conversations
     */
    @GetMapping
    public ResponseEntity<?> getAllConversations() {
        return ResponseEntity.ok(conversationService.getAllConversations());
    }

    /**
     * Delete a conversation
     * @param conversationId Conversation ID to delete
     * @return Success message
     */
    @DeleteMapping("/{conversationId}")
    public ResponseEntity<?> deleteConversation(@PathVariable String conversationId) {
        conversationService.deleteConversation(conversationId);
        return ResponseEntity.ok().build();
    }
}