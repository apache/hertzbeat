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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.springframework.ai.chat.messages.part.TextPart;
import org.springframework.ai.chat.messages.part.ToolCallPart;

/** Ordered public text/tool references. Opaque and reasoning payloads stay exclusively in the encrypted sidecar. */
public final class AgentPublicMessageParts {
    private AgentPublicMessageParts() { }

    public static List<TranscriptContent> project(AgentModelParts value, List<TranscriptContent> fallback,
                                                  boolean includeText) {
        if (value == null) {
            return fallback;
        }
        String combined = value.parts().stream().filter(TextPart.class::isInstance).map(TextPart.class::cast)
                .map(TextPart::text).collect(java.util.stream.Collectors.joining());
        List<TranscriptContent> ordered = new ArrayList<>();
        for (var part : value.parts()) {
            if (includeText && part instanceof TextPart text) {
                ordered.add(TranscriptContent.text(text.text()));
            } else if (part instanceof ToolCallPart call) {
                var matches = fallback.stream().filter(TranscriptContent::isToolCall)
                        .filter(block -> Objects.equals(block.getId(), call.toolCall().id())).toList();
                if (matches.size() != 1 || ordered.stream().anyMatch(block -> block.isToolCall()
                        && Objects.equals(block.getId(), call.toolCall().id()))) {
                    throw AgentRuntimeModelException.nonRetryable("Provider tool call pairing is invalid", null);
                }
                ordered.add(matches.getFirst());
            }
        }
        long expectedCalls = fallback.stream().filter(TranscriptContent::isToolCall).count();
        if (ordered.stream().filter(TranscriptContent::isToolCall).count() != expectedCalls) {
            throw AgentRuntimeModelException.nonRetryable("Provider tool call pairing is incomplete", null);
        }
        // Redact across boundaries first: a credential may span two provider text parts.
        if (includeText && !Objects.equals(combined, GatewayText.redactSecrets(combined))) {
            List<TranscriptContent> safe = new ArrayList<>();
            safe.add(TranscriptContent.text(GatewayText.redactSecrets(combined)));
            fallback.stream().filter(TranscriptContent::isToolCall).forEach(safe::add);
            return List.copyOf(safe);
        }
        return List.copyOf(ordered);
    }

    public static List<TranscriptContent> eventParts(AgentRuntimeModelResponse response) {
        if (response == null || response.getModelParts() == null) {
            return null;
        }
        List<TranscriptContent> references = response.getToolCalls().stream()
                .map(call -> TranscriptContent.toolCall(call.getToolCallId(), call.getToolName(), null)).toList();
        return project(response.getModelParts(), references, true);
    }
}
