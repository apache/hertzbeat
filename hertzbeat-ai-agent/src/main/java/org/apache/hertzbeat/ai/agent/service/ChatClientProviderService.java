package org.apache.hertzbeat.ai.agent.service;

import org.apache.hertzbeat.ai.agent.pojo.dto.ChatRequestContext;

/**
 * Service for interacting with LLM providers (like OpenAI, Anthropic, etc.)
 */
public interface ChatClientProviderService {

    String complete(String message);

    String streamChat(ChatRequestContext context);
}