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

import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Mutable counters and bounded artifacts for one loop run.
 */
final class AgentRuntimeLoopState {

    private static final int MAX_DISCOVERED_TOOLS = 20;

    private final List<TranscriptMessage> messages = new ArrayList<>();
    private final Set<String> startedItemIds = new HashSet<>();
    private final Map<String, AgentToolDescriptor> discoveredTools = new LinkedHashMap<>();

    private final Map<String, ReadFailureStreak> readFailureStreaks = new LinkedHashMap<>();

    private final AgentRuntimeReadBudget readBudget = new AgentRuntimeReadBudget();
    private final Set<String> countedToolCallIds = new HashSet<>();
    private String restoredBudgetStop;

    private int usageBaselineStartIndex;
    private int modelRequestCount;
    private int toolCallCount;
    private long eventSequence;
    private String currentAssistantMessageItemId;
    private int currentAssistantMessageDeltaIndex;
    private boolean currentAssistantMessageStarted;
    private boolean successfulReadObservation;

    AgentRuntimeLoopState(List<TranscriptMessage> initialMessages) {
        this(initialMessages, null, null, true);
    }

    AgentRuntimeLoopState(List<TranscriptMessage> initialMessages, String currentRunUid) {
        this(initialMessages, currentRunUid, null, true);
    }

    AgentRuntimeLoopState(List<TranscriptMessage> initialMessages, String currentRunUid, AgentTargetRef currentTarget) {
        this(initialMessages, currentRunUid, currentTarget, true);
    }

    AgentRuntimeLoopState(List<TranscriptMessage> initialMessages, String currentRunUid, AgentTargetRef currentTarget,
                          boolean groundingEligible) {
        this(initialMessages, currentRunUid, currentTarget, groundingEligible, false);
    }

    AgentRuntimeLoopState(List<TranscriptMessage> initialMessages, String currentRunUid, AgentTargetRef currentTarget,
                          boolean groundingEligible, AgentRuntimeContext context) {
        this(initialMessages, currentRunUid, currentTarget, groundingEligible,
                context != null && context.hasVerifiedDurableGrounding());
    }

    private AgentRuntimeLoopState(List<TranscriptMessage> initialMessages, String currentRunUid,
                                  AgentTargetRef currentTarget, boolean groundingEligible,
                                  boolean durableGroundingVerified) {
        if (initialMessages != null) {
            initialMessages.stream().filter(Objects::nonNull).forEach(messages::add);
        }
        usageBaselineStartIndex = messages.size();
        successfulReadObservation = groundingEligible && durableGroundingVerified;
    }

    void addTurnMessage(TranscriptMessage message) {
        // Turn history is replayed directly into the next model request and cannot contain null entries.
        messages.add(Objects.requireNonNull(message, "message must not be null"));
    }

    void replaceMessages(List<TranscriptMessage> compactedMessages) {
        messages.clear();
        messages.addAll(compactedMessages);
        usageBaselineStartIndex = messages.size();
        // A live observation remains valid for this invocation even when compaction prunes its marker.
    }

    void incrementModelRequestCount() {
        modelRequestCount++;
    }

    boolean hasCountedToolCall(String toolCallId) {
        return countedToolCallIds.contains(toolCallId);
    }

    void incrementToolCallCount(String toolCallId) {
        if (countedToolCallIds.add(toolCallId)) {
            toolCallCount++;
        }
    }

    void restoreBudget(List<AgentRuntimeReadBudget.Attempt> attempts, AgentRuntimeProperties limits) {
        for (var attempt : attempts) {
            if (countedToolCallIds.add(attempt.toolCallId())) {
                toolCallCount++;
                String stop = readBudget.record(attempt, limits);
                if (stop != null) {
                    restoredBudgetStop = stop;
                }
            }
        }
    }

    String budgetStop() {
        return restoredBudgetStop;
    }

    String recordReadBudget(AgentRuntimeToolCall call, AgentToolExecutionResult result, AgentRuntimeProperties limits) {
        return readBudget.record(call, result, limits);
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

    int recordReadResult(AgentToolExecutionResult result) {
        if (result.getRisk() != AgentToolRisk.READ) {
            return 0;
        }
        String tool = result.getToolName();
        if (result.getStatus() == AgentToolStatus.SUCCEEDED) {
            readFailureStreaks.remove(tool);
            return 0;
        }
        if (result.getStatus() != AgentToolStatus.FAILED && result.getStatus() != AgentToolStatus.DENIED) {
            return 0;
        }
        String reason = AgentRuntimeTextSanitizer.redact(result.getErrorMessage());
        ReadFailureStreak previous = readFailureStreaks.get(tool);
        int count = previous != null && Objects.equals(previous.reason(), reason) ? previous.count() + 1 : 1;
        readFailureStreaks.put(tool, new ReadFailureStreak(reason, count));
        return count;
    }

    private record ReadFailureStreak(String reason, int count) { }

    void recordSuccessfulReadObservation() {
        successfulReadObservation = true;
    }

    boolean hasSuccessfulReadObservation() {
        return successfulReadObservation;
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
