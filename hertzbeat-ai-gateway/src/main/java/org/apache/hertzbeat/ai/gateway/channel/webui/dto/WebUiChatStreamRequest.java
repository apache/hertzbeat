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

package org.apache.hertzbeat.ai.gateway.channel.webui.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;

/**
 * WebUI chat stream request.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WebUiChatStreamRequest {

    /**
     * Stable conversation ID used to locate the Gateway session.
     */
    @NotBlank
    @Size(max = 256)
    private String conversationId;

    /**
     * Stable message ID used to locate the Gateway run on retries.
     */
    @NotBlank
    @Size(max = 128)
    private String messageId;

    /**
     * User input text.
     */
    @NotBlank
    @Size(max = 8192)
    private String message;

    /**
     * Optional target reference.
     */
    @Valid
    private AgentTargetRef target;

    /**
     * Optional attachment references.
     */
    private List<String> attachments;
}
