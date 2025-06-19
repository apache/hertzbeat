package org.apache.hertzbeat.ai.agent.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Chat request context for AI chat endpoint.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequestContext {
    /**
     * The user's message (required)
     */
    private String message;
    /**
     * Optional conversation ID for context
     */
    private String conversationId;
}