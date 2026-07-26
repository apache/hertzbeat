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

package org.apache.hertzbeat.ai.gateway.runtime.provider;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeModelRequest;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.tool.ToolCallback;

/**
 * Maps provider-neutral runtime request values to provider-specific Spring AI options.
 */
@FunctionalInterface
public interface AgentModelRequestOptionsFactory {

    /**
     * Create request options for one model invocation.
     *
     * @param request runtime model request
     * @param toolCallbacks model-visible tools
     * @return Spring AI request options
     */
    ChatOptions create(AgentRuntimeModelRequest request, List<ToolCallback> toolCallbacks);
}
