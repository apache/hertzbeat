package org.apache.hertzbeat.ai.agent.service.impl;

import org.apache.hertzbeat.ai.agent.service.ChatClientProviderService;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.agent.pojo.dto.ChatRequestContext;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;

/**
 * Implementation of the {@link ChatClientProviderService}.
 * Provides functionality to interact with the ChatClient for handling chat
 * messages.
 */
@Service
public class ChatClientProviderServiceImpl implements ChatClientProviderService {

    private final ChatClient chatClient;

    @Qualifier("hertzbeatTools")
    @Autowired
    private ToolCallbackProvider toolCallbackProvider;

    @Autowired
    public ChatClientProviderServiceImpl(@Qualifier("openAiChatClient") ChatClient openAiChatClient) {
        this.chatClient = openAiChatClient;
    }

    @Override
    public String complete(String message) {
        return this.chatClient.prompt()
                .user(message)
                .call()
                .content();
    }

    @Override
    public String streamChat(ChatRequestContext context) {
        return this.chatClient.prompt()
                .user(context.getMessage())
                .toolCallbacks(toolCallbackProvider)
                .call()
                .content();
    }
}
