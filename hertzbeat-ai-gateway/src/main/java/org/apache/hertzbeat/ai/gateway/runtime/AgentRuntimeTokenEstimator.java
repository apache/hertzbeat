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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;

/**
 * Coarse model-context estimator matching Codex's four UTF-8 bytes per token heuristic.
 */
final class AgentRuntimeTokenEstimator {

    private static final long BYTES_PER_TOKEN = 4L;
    private static final long MESSAGE_OVERHEAD_TOKENS = 12L;
    private static final long TOOL_OVERHEAD_TOKENS = 12L;

    long estimateRequest(AgentRuntimeModelRequest request) {
        return estimateFixedContext(request.getPrompt(), request.getAvailableTools())
            + estimateMessages(request.getChatHistory());
    }

    long estimateFixedContext(RuntimePrompt prompt, List<AgentToolDescriptor> availableTools) {
        long tokens = estimateText(prompt == null ? null : prompt.getInstructions());
        if (prompt != null) {
            for (RuntimePrompt.Block block : prompt.getBlocks()) {
                if (block == null) {
                    continue;
                }
                tokens += estimateText(block.getRole() == null ? null : block.getRole().name());
                tokens += estimateText(block.getFrame() == null ? null : block.getFrame().name());
                tokens += estimateText(block.getContent());
            }
        }
        if (availableTools != null) {
            for (AgentToolDescriptor tool : availableTools) {
                if (tool == null) {
                    continue;
                }
                tokens += TOOL_OVERHEAD_TOKENS;
                tokens += estimateText(tool.getName());
                tokens += estimateText(tool.getNamespace());
                tokens += estimateText(tool.getDescription());
                tokens += estimateText(tool.getInputSchema());
            }
        }
        return Math.max(1L, tokens);
    }

    long estimateMessages(List<TranscriptMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return 0L;
        }
        long tokens = 0L;
        for (TranscriptMessage message : messages) {
            tokens += estimateMessage(message);
        }
        return tokens;
    }

    long estimateText(String text) {
        if (text == null || text.isEmpty()) {
            return 0L;
        }
        long bytes = text.getBytes(StandardCharsets.UTF_8).length;
        return (bytes + BYTES_PER_TOKEN - 1L) / BYTES_PER_TOKEN;
    }

    private long estimateMessage(TranscriptMessage message) {
        if (message == null) {
            return 0L;
        }
        long tokens = MESSAGE_OVERHEAD_TOKENS;
        tokens += estimateText(message.getRole() == null ? null : message.getRole().wireValue());
        tokens += estimateText(message.getToolName());
        tokens += estimateText(message.getToolCallId());
        tokens += estimateText(message.getErrorMessage());
        if (message.getRole() == TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY) {
            return tokens + estimateText(message.renderedCompactionSummary());
        }
        if (message.getContent() == null) {
            return tokens;
        }
        for (TranscriptContent block : message.getContent()) {
            if (block == null) {
                continue;
            }
            tokens += estimateText(block.getType());
            tokens += estimateText(block.getText());
            tokens += estimateText(block.getId());
            tokens += estimateText(block.getName());
            tokens += estimateText(Objects.toString(block.getInput(), ""));
        }
        return tokens;
    }
}
