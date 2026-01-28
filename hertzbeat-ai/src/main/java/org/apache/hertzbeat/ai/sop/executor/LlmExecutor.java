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

package org.apache.hertzbeat.ai.sop.executor;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.service.ChatClientProviderService;
import org.apache.hertzbeat.ai.sop.model.SopStep;
import org.apache.hertzbeat.ai.sop.util.SopMessageUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Executor for 'llm' type steps.
 * Calls the AI model for reasoning or summarization.
 * Reuses the existing ChatClientProviderService for LLM interaction.
 */
@Slf4j
@Component
public class LlmExecutor implements SopExecutor {

    private final ChatClientProviderService chatClientProviderService;

    @Autowired
    public LlmExecutor(ChatClientProviderService chatClientProviderService) {
        this.chatClientProviderService = chatClientProviderService;
    }

    @Override
    public boolean support(String type) {
        return "llm".equalsIgnoreCase(type);
    }

    @Override
    public Object execute(SopStep step, Map<String, Object> context) {
        String prompt = step.getPrompt();
        if (prompt == null || prompt.trim().isEmpty()) {
            throw new IllegalArgumentException("LLM step must have a 'prompt' field");
        }

        // Check if LLM is configured
        if (!chatClientProviderService.isConfigured()) {
            log.warn("LLM provider is not configured, returning mock response");
            return "Mock LLM response: Provider not configured";
        }

        // Resolve variables in prompt from context
        String resolvedPrompt = resolvePrompt(prompt, context);
        
        // Add language instruction based on configuration
        String language = (String) context.getOrDefault("_language", "zh");
        resolvedPrompt = addLanguageInstruction(resolvedPrompt, language);
        
        log.info("Executing LLM step with prompt length: {}", resolvedPrompt.length());

        try {
            // Build chat request context
            ChatRequestContext chatContext = ChatRequestContext.builder()
                    .message(resolvedPrompt)
                    .build();
            
            // Use existing service to get response (collect stream to string)
            StringBuilder responseBuilder = new StringBuilder();
            chatClientProviderService.streamChat(chatContext)
                    .doOnNext(responseBuilder::append)
                    .blockLast();
            
            String response = responseBuilder.toString();
            log.debug("LLM response length: {}", response.length());
            return response;
        } catch (Exception e) {
            log.error("Failed to execute LLM step: {}", e.getMessage());
            throw new RuntimeException("LLM execution failed", e);
        }
    }
    
    private String addLanguageInstruction(String prompt, String language) {
        String langInstruction = SopMessageUtil.getMessage("sop.llm.language.instruction", language);
        return "\n\n[" + langInstruction + "]\n\n" + prompt;
    }

    private String resolvePrompt(String prompt, Map<String, Object> context) {
        // Simple variable replacement: ${variable} -> context.get("variable")
        String result = prompt;
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            String placeholder = "${" + entry.getKey() + "}";
            if (result.contains(placeholder)) {
                result = result.replace(placeholder, String.valueOf(entry.getValue()));
            }
        }
        return result;
    }
}
