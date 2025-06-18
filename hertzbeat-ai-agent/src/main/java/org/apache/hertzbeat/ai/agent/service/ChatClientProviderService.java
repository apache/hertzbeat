package org.apache.hertzbeat.ai.agent.service;


/**
 * Service for interacting with LLM providers (like OpenAI, Anthropic, etc.)
 */
public interface ChatClientProviderService {

    String complete(String message);
}