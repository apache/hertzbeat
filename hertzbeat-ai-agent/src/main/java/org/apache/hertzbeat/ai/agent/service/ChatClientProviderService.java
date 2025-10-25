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

import org.apache.hertzbeat.ai.agent.pojo.dto.ChatRequestContext;
import reactor.core.publisher.Flux;

/**
 * Service for interacting with LLM providers (like OpenAI, Anthropic, etc.)
 */
public interface ChatClientProviderService {

    /**
     * Stream chat response from the LLM
     *
     * @param context Chat request context containing message and conversation history
     * @return Flux of string chunks from the LLM response
     */
    Flux<String> streamChat(ChatRequestContext context);

    /**
     * Check if provider is properly configured
     * @return true if configured and enabled
     */
    boolean isConfigured();
}
