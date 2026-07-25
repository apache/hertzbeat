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

package org.apache.hertzbeat.ai.gateway.contract;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Objects;
import lombok.Builder;
import lombok.Getter;
import org.springframework.util.StringUtils;

/**
 * Normalized user input accepted by Agent Gateway channels.
 */
@Getter
public class UserInput {

    @Size(max = 128)
    private final String messageId;

    @Size(max = 256)
    private final String conversationId;

    @Valid
    private final AgentTargetRef target;

    @Valid
    private final AgentAlertIncidentContext alertIncident;

    @Valid
    private final Message message;

    @Builder(toBuilder = true)
    private UserInput(String messageId, String conversationId, AgentTargetRef target,
                      AgentAlertIncidentContext alertIncident, Message message) {
        if (!StringUtils.hasText(conversationId)) {
            throw new IllegalArgumentException("Agent input conversation id is required");
        }
        this.messageId = messageId;
        this.conversationId = conversationId;
        this.target = target;
        this.alertIncident = alertIncident;
        // UserInput is the channel-normalization boundary consumed by session, run, transcript, and runtime services.
        this.message = Objects.requireNonNull(message, "Agent input message is required");
    }

    /**
     * Normalized message content owned by one user input.
     */
    @Builder
    public record Message(String text, List<String> attachments) {

        public Message {
            if (!StringUtils.hasText(text)) {
                throw new IllegalArgumentException("Agent message text is required");
            }
            attachments = attachments == null ? List.of() : List.copyOf(attachments);
        }

        public String getText() {
            return text;
        }

        public List<String> getAttachments() {
            return attachments;
        }
    }
}
