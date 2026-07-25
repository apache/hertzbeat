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

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Provider-neutral transcript message used for replay and persistence.
 */
@Getter
@Setter
@Builder(toBuilder = true)
@AllArgsConstructor
@NoArgsConstructor
public class TranscriptMessage {

    public static final String COMPACTION_SUMMARY_PREFIX =
        "The conversation history before this point was compacted into the following summary:\n\n<summary>\n";
    public static final String COMPACTION_SUMMARY_SUFFIX = "\n</summary>";

    private TranscriptRole role;

    @Builder.Default
    private List<TranscriptContent> content = new ArrayList<>();

    /** Model-visible tool call identifier returned with a tool result. */
    private String toolCallId;

    private String toolName;

    /** Model-visible error */
    private String errorMessage;

    /**
     * Provider usage for the complete primary model response that produced this assistant message.
     */
    private AgentRuntimeModelResponse.Usage usage;

    private boolean pruned;

    /** Durable ordering assigned when the message is appended to a session. */
    private Long sessionSequence;

    private Long summarizedThroughSessionSequence;

    private Long firstKeptSessionSequence;

    public static TranscriptMessage userText(String text) {
        return TranscriptMessage.builder()
            .role(TranscriptRole.USER)
            .content(List.of(TranscriptContent.text(text)))
            .build();
    }

    public static TranscriptMessage assistantText(String text) {
        return assistantText(text, null);
    }

    public static TranscriptMessage assistantText(String text, AgentRuntimeModelResponse.Usage usage) {
        return TranscriptMessage.builder()
            .role(TranscriptRole.ASSISTANT)
            .content(List.of(TranscriptContent.text(text)))
            .usage(usage)
            .build();
    }

    public static TranscriptMessage assistantToolCalls(String text, List<TranscriptContent> toolCalls) {
        return assistantToolCalls(text, toolCalls, null);
    }

    public static TranscriptMessage assistantToolCalls(String text, List<TranscriptContent> toolCalls,
                                                       AgentRuntimeModelResponse.Usage usage) {
        List<TranscriptContent> content = new ArrayList<>();
        if (text != null && !text.isBlank()) {
            content.add(TranscriptContent.text(text));
        }
        if (toolCalls != null) {
            content.addAll(toolCalls.stream()
                .filter(block -> block != null && block.isToolCall())
                .toList());
        }
        return TranscriptMessage.builder()
            .role(TranscriptRole.ASSISTANT)
            .content(content)
            .usage(usage)
            .build();
    }

    public static TranscriptMessage toolResult(String toolCallId, String toolName,
                                               String text, String errorMessage) {
        return TranscriptMessage.builder()
            .role(TranscriptRole.TOOL_RESULT)
            .toolCallId(toolCallId)
            .toolName(toolName)
            .errorMessage(errorMessage)
            .content(List.of(TranscriptContent.text(text)))
            .build();
    }

    public static TranscriptMessage compactionSummary(String summary, Long summarizedThroughSessionSequence,
                                                      Long firstKeptSessionSequence) {
        return TranscriptMessage.builder()
            .role(TranscriptRole.COMPACTION_SUMMARY)
            .content(List.of(TranscriptContent.text(summary)))
            .summarizedThroughSessionSequence(summarizedThroughSessionSequence)
            .firstKeptSessionSequence(firstKeptSessionSequence)
            .pruned(true)
            .build();
    }

    public String renderedCompactionSummary() {
        return COMPACTION_SUMMARY_PREFIX + text() + COMPACTION_SUMMARY_SUFFIX;
    }

    public Long compactionSummarizedThroughSessionSequence() {
        return summarizedThroughSessionSequence;
    }

    public Long compactionFirstKeptSessionSequence() {
        return firstKeptSessionSequence;
    }

    public List<TranscriptContent> toolCalls() {
        if (content == null || content.isEmpty()) {
            return List.of();
        }
        return content.stream()
            .filter(block -> block != null && block.isToolCall()
                && block.getId() != null && !block.getId().isBlank()
                && block.getName() != null && !block.getName().isBlank())
            .toList();
    }

    public String text() {
        if (content == null || content.isEmpty()) {
            return "";
        }
        return content.stream()
            .filter(block -> block != null && block.isText())
            .map(TranscriptContent::getText)
            .filter(value -> value != null && !value.isBlank())
            .reduce((left, right) -> left + "\n" + right)
            .orElse("");
    }

    public boolean hasReplayContent() {
        if (role == TranscriptRole.TOOL_RESULT) {
            return toolCallId != null && !toolCallId.isBlank()
                && toolName != null && !toolName.isBlank();
        }
        if (role == TranscriptRole.COMPACTION_SUMMARY) {
            return !text().isBlank();
        }
        if (role == TranscriptRole.ASSISTANT) {
            return !text().isBlank() || !toolCalls().isEmpty();
        }
        return !text().isBlank();
    }

    /** Stable transcript roles used in persisted JSON and model replay. */
    public enum TranscriptRole {
        USER("user"),
        ASSISTANT("assistant"),
        TOOL_RESULT("toolResult"),
        COMPACTION_SUMMARY("compactionSummary");

        private final String wireValue;

        TranscriptRole(String wireValue) {
            this.wireValue = wireValue;
        }

        @JsonValue
        public String wireValue() {
            return wireValue;
        }

        @JsonCreator
        public static TranscriptRole fromWireValue(String wireValue) {
            for (TranscriptRole role : values()) {
                if (role.wireValue.equals(wireValue)) {
                    return role;
                }
            }
            throw new IllegalArgumentException("Unsupported transcript role: " + wireValue);
        }
    }
}
