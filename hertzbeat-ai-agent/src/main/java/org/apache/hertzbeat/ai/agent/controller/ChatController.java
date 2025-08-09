package org.apache.hertzbeat.ai.agent.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.apache.hertzbeat.ai.agent.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.agent.service.ChatClientProviderService;


/**
 * Controller class for handling chat-related HTTP requests.
 */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatClientProviderService chatClientProviderService;

    @Autowired
    public ChatController(@Qualifier("openAiChatClient") ChatClient openAiChatClient,
            ChatClientProviderService chatClientProviderService) {
        this.chatClientProviderService = chatClientProviderService;
    }

    /**
     * Send a message and get a streaming response
     * 
     * @param context The chat request context containing message and optional
     *                conversationId
     * @return SSE emitter for streaming response
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(@RequestBody ChatRequestContext context) {
        SseEmitter emitter = new SseEmitter();
        new Thread(() -> {
            try {
                String aiResponse = chatClientProviderService.streamChat(context);
                emitter.send(aiResponse);
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        }).start();
        return emitter;
    }
}