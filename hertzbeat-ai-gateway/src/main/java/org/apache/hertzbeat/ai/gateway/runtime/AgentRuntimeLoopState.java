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
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;

/**
 * Mutable counters and bounded artifacts for one loop run.
 */
final class AgentRuntimeLoopState {

    private static final int MAX_DISCOVERED_TOOLS = 20;

    private final List<TranscriptMessage> messages = new ArrayList<>();
    private final Set<String> startedItemIds = new HashSet<>();
    private final Map<String, AgentToolDescriptor> discoveredTools = new LinkedHashMap<>();

    private int usageBaselineStartIndex;
    private int modelRequestCount;
    private int toolCallCount;
    private long eventSequence;
    private String currentAssistantMessageItemId;
    private int currentAssistantMessageDeltaIndex;
    private boolean currentAssistantMessageStarted;

    AgentRuntimeLoopState(List<TranscriptMessage> initialMessages) {
        if (initialMessages != null) {
            initialMessages.stream().filter(Objects::nonNull).forEach(messages::add);
        }
        usageBaselineStartIndex = messages.size();
    }

    void addTurnMessage(TranscriptMessage message) {
        // Turn history is replayed directly into the next model request and cannot contain null entries.
        messages.add(Objects.requireNonNull(message, "message must not be null"));
    }

    void replaceMessages(List<TranscriptMessage> compactedMessages) {
        messages.clear();
        messages.addAll(compactedMessages);
        usageBaselineStartIndex = messages.size();
    }

    void incrementModelRequestCount() {
        modelRequestCount++;
    }

    void incrementToolCallCount() {
        toolCallCount++;
    }

    long nextEventSequence() {
        return ++eventSequence;
    }

    String beginAssistantMessageStream() {
        currentAssistantMessageItemId = "msg_" + UUID.randomUUID();
        currentAssistantMessageDeltaIndex = 0;
        currentAssistantMessageStarted = false;
        return currentAssistantMessageItemId;
    }

    String currentAssistantMessageItemId() {
        return currentAssistantMessageItemId;
    }

    int nextAssistantMessageDeltaIndex() {
        return currentAssistantMessageDeltaIndex++;
    }

    boolean hasCurrentAssistantMessageStarted() {
        return currentAssistantMessageStarted;
    }

    void finishAssistantMessageStream(String itemId) {
        if (!Objects.equals(currentAssistantMessageItemId, itemId)) {
            return;
        }
        currentAssistantMessageItemId = null;
        currentAssistantMessageDeltaIndex = 0;
        currentAssistantMessageStarted = false;
    }

    int getModelRequestCount() {
        return modelRequestCount;
    }

    int getToolCallCount() {
        return toolCallCount;
    }

    List<TranscriptMessage> messages() {
        return List.copyOf(messages);
    }

    int latestCurrentRunUsageMessageIndex() {
        for (int i = messages.size() - 1; i >= usageBaselineStartIndex; i--) {
            TranscriptMessage message = messages.get(i);
            AgentRuntimeModelResponse.Usage usage = message.getUsage();
            if (message.getRole() == TranscriptMessage.TranscriptRole.ASSISTANT
                && usage != null && usage.totalTokens() > 0) {
                return i;
            }
        }
        return -1;
    }

    void addDiscoveredTools(List<AgentToolDescriptor> tools) {
        for (AgentToolDescriptor tool : tools) {
            discoveredTools.remove(tool.getName());
            discoveredTools.put(tool.getName(), tool);
        }
        while (discoveredTools.size() > MAX_DISCOVERED_TOOLS) {
            discoveredTools.remove(discoveredTools.keySet().iterator().next());
        }
    }

    List<AgentToolDescriptor> availableTools(List<AgentToolDescriptor> visibleTools) {
        Map<String, AgentToolDescriptor> tools = new LinkedHashMap<>();
        visibleTools.forEach(tool -> tools.put(tool.getName(), tool));
        tools.putAll(discoveredTools);
        return List.copyOf(tools.values());
    }

    boolean markItemStarted(String itemId) {
        if (itemId != null && Objects.equals(currentAssistantMessageItemId, itemId)) {
            currentAssistantMessageStarted = true;
        }
        return itemId != null && startedItemIds.add(itemId);
    }
}
