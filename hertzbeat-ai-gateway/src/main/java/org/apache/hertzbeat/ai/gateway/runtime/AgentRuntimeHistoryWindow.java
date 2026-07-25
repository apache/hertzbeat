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
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.util.StringUtils;

/**
 * Runtime history window and compaction checkpoint builder.
 */
public final class AgentRuntimeHistoryWindow {

    private static final AgentRuntimeTokenEstimator TOKEN_ESTIMATOR = new AgentRuntimeTokenEstimator();
    private static final long SUMMARY_MESSAGE_OVERHEAD_TOKENS = TOKEN_ESTIMATOR.estimateMessages(
        List.of(TranscriptMessage.compactionSummary("", null, null)));

    private AgentRuntimeHistoryWindow() {
    }

    public static List<TranscriptMessage> replayWindow(List<TranscriptMessage> history) {
        if (history == null || history.isEmpty()) {
            return List.of();
        }
        int start = latestCompactionSummary(history);
        List<TranscriptMessage> window = new ArrayList<>(history.size() - start);
        boolean markNextRetainedAsPruned = start > 0;
        for (int i = start; i < history.size(); i++) {
            TranscriptMessage message = history.get(i);
            if (isEmpty(message)) {
                continue;
            }
            if (markNextRetainedAsPruned) {
                message = message.toBuilder().pruned(true).build();
                markNextRetainedAsPruned = false;
            }
            window.add(message);
        }
        return Collections.unmodifiableList(repairToolCallResultPairing(window));
    }

    public static CompactionResult compactWithCheckpoint(List<TranscriptMessage> history, Policy policy,
                                                         SummaryGenerator summaryGenerator) {
        if (history == null || history.isEmpty()) {
            return new CompactionResult(List.of(), null);
        }
        Policy safePolicy = policy.validated();
        List<TranscriptMessage> window = replayWindow(history);
        if (window.isEmpty()) {
            return new CompactionResult(List.of(), null);
        }
        long promptBudget = safePolicy.historyTokenBudget();
        if (TOKEN_ESTIMATOR.estimateMessages(window) < promptBudget) {
            return new CompactionResult(Collections.unmodifiableList(window), null);
        }
        CompactedHistory compacted = compactHistory(window, safePolicy, promptBudget, summaryGenerator);
        return new CompactionResult(Collections.unmodifiableList(compacted.messages()), compacted.checkpoint());
    }

    private static int latestCompactionSummary(List<TranscriptMessage> history) {
        for (int i = history.size() - 1; i >= 0; i--) {
            if (sameRole(history.get(i), TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY)) {
                return i;
            }
        }
        return 0;
    }

    private static CompactedHistory compactHistory(List<TranscriptMessage> messages, Policy policy,
                                                   long promptBudget, SummaryGenerator summaryGenerator) {
        long recentBudget = Math.min(policy.retainRecentTokens(),
            promptBudget - policy.summaryTokenBudget() - SUMMARY_MESSAGE_OVERHEAD_TOKENS);
        if (recentBudget <= 0) {
            throw new IllegalStateException("History compaction has no token budget for recent messages");
        }
        int keepStart = recentTailStart(messages, recentBudget);
        if (keepStart <= 0 && messages.size() > 1) {
            keepStart = 1;
        }
        List<TranscriptMessage> dropped = new ArrayList<>(messages.subList(0, keepStart));
        List<TranscriptMessage> tail = new ArrayList<>(messages.subList(keepStart, messages.size()));
        if (tail.isEmpty() && !dropped.isEmpty()) {
            tail.add(dropped.remove(dropped.size() - 1));
        }
        while (TOKEN_ESTIMATOR.estimateMessages(tail)
            + policy.summaryTokenBudget() + SUMMARY_MESSAGE_OVERHEAD_TOKENS >= promptBudget
            && canDropFirstTailTurn(tail)) {
            dropped.addAll(removeFirstTailTurn(tail));
        }
        while (true) {
            String summary = summaryGenerator.summarize(List.copyOf(dropped), policy.summaryTokenBudget());
            if (!StringUtils.hasText(summary)) {
                throw new IllegalStateException("History compaction model returned no summary");
            }
            // Compaction is the intentional lossy boundary; redact persisted free-form text before replay.
            summary = AgentRuntimeTextSanitizer.redact(summary);
            CompactedHistory compacted = compactedMessages(dropped, tail, summary);
            if (TOKEN_ESTIMATOR.estimateMessages(compacted.messages()) < promptBudget) {
                return compacted;
            }
            if (!canDropFirstTailTurn(tail)) {
                throw new IllegalStateException("Compacted history still exceeds the configured token budget");
            }
            dropped.addAll(removeFirstTailTurn(tail));
        }
    }

    private static CompactedHistory compactedMessages(List<TranscriptMessage> dropped,
                                                       List<TranscriptMessage> tail,
                                                       String summary) {
        Long summarizedThroughSessionSequence = summarizedThroughSessionSequence(dropped);
        Long firstKeptSessionSequence = firstRawSessionSequence(tail);
        TranscriptMessage checkpointMessage = TranscriptMessage.compactionSummary(
            summary, summarizedThroughSessionSequence, firstKeptSessionSequence);
        List<TranscriptMessage> compacted = new ArrayList<>();
        compacted.add(checkpointMessage);
        for (int i = 0; i < tail.size(); i++) {
            TranscriptMessage retained = tail.get(i).toBuilder()
                .usage(null)
                .pruned(i == 0 || tail.get(i).isPruned())
                .build();
            compacted.add(retained);
        }
        List<TranscriptMessage> repaired = new ArrayList<>(repairToolCallResultPairing(compacted));
        return new CompactedHistory(repaired, new CompactionCheckpoint(checkpointMessage,
            summarizedThroughSessionSequence, firstKeptSessionSequence));
    }

    private static boolean canDropFirstTailTurn(List<TranscriptMessage> tail) {
        if (tail == null || tail.size() <= 1) {
            return false;
        }
        if (sameRole(tail.get(0), TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY)) {
            return true;
        }
        int userTurns = 0;
        for (TranscriptMessage message : tail) {
            if (sameRole(message, TranscriptMessage.TranscriptRole.USER)) {
                userTurns++;
                if (userTurns > 1) {
                    return true;
                }
            }
        }
        return !sameRole(tail.get(0), TranscriptMessage.TranscriptRole.USER);
    }

    private static List<TranscriptMessage> removeFirstTailTurn(List<TranscriptMessage> tail) {
        if (tail == null || tail.isEmpty()) {
            return List.of();
        }
        List<TranscriptMessage> removed = new ArrayList<>();
        TranscriptMessage first = tail.remove(0);
        removed.add(first);
        if (sameRole(first, TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY)) {
            return removed;
        }
        while (!tail.isEmpty()
            && !sameRole(tail.get(0), TranscriptMessage.TranscriptRole.USER)
            && !sameRole(tail.get(0), TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY)) {
            removed.add(tail.remove(0));
        }
        return removed;
    }

    private static Long summarizedThroughSessionSequence(List<TranscriptMessage> dropped) {
        Long summarizedThrough = null;
        for (TranscriptMessage message : dropped) {
            if (message == null) {
                continue;
            }
            Long candidate = sameRole(message, TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY)
                ? message.compactionSummarizedThroughSessionSequence()
                : message.getSessionSequence();
            summarizedThrough = max(summarizedThrough, candidate);
        }
        return summarizedThrough;
    }

    private static Long firstRawSessionSequence(List<TranscriptMessage> messages) {
        if (messages == null) {
            return null;
        }
        for (TranscriptMessage message : messages) {
            if (message != null && !sameRole(message, TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY)) {
                return message.getSessionSequence();
            }
        }
        return null;
    }

    private static Long max(Long left, Long right) {
        if (left == null) {
            return right;
        }
        if (right == null) {
            return left;
        }
        return Math.max(left, right);
    }

    private static int recentTailStart(List<TranscriptMessage> messages, long recentTokenBudget) {
        if (messages.isEmpty()) {
            return 0;
        }
        long accumulated = 0;
        int start = messages.size() - 1;
        for (int i = messages.size() - 1; i >= 0; i--) {
            long next = TOKEN_ESTIMATOR.estimateMessages(List.of(messages.get(i)));
            if (i < messages.size() - 1 && accumulated + next > recentTokenBudget) {
                break;
            }
            accumulated += next;
            start = i;
        }
        while (start > 0
            && !sameRole(messages.get(start), TranscriptMessage.TranscriptRole.USER)
            && !sameRole(messages.get(start), TranscriptMessage.TranscriptRole.COMPACTION_SUMMARY)) {
            start--;
        }
        return start;
    }

    private static List<TranscriptMessage> repairToolCallResultPairing(List<TranscriptMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return List.of();
        }
        List<TranscriptMessage> repaired = new ArrayList<>(messages.size());
        for (int i = 0; i < messages.size(); i++) {
            TranscriptMessage message = messages.get(i);
            if (isToolResult(message)) {
                continue;
            }
            if (!isAssistantToolCall(message)) {
                repaired.add(message);
                continue;
            }
            int resultEnd = i + 1;
            List<TranscriptMessage> followingResults = new ArrayList<>();
            while (resultEnd < messages.size() && isToolResult(messages.get(resultEnd))) {
                followingResults.add(messages.get(resultEnd));
                resultEnd++;
            }
            ToolPairRepair repair = repairAssistantToolCalls(message, followingResults);
            if (!isEmpty(repair.assistant())) {
                repaired.add(repair.assistant());
            }
            repaired.addAll(repair.results());
            i = resultEnd - 1;
        }
        return repaired;
    }

    private static ToolPairRepair repairAssistantToolCalls(TranscriptMessage assistant,
                                                           List<TranscriptMessage> followingResults) {
        Map<String, TranscriptMessage> resultKeys = new LinkedHashMap<>();
        for (TranscriptMessage result : followingResults) {
            String key = toolResultKey(result);
            if (StringUtils.hasText(key)) {
                resultKeys.putIfAbsent(key, result);
            }
        }
        List<TranscriptContent> content = new ArrayList<>();
        Set<String> retainedToolCallKeys = new LinkedHashSet<>();
        if (assistant.getContent() != null) {
            for (TranscriptContent block : assistant.getContent()) {
                if (block == null) {
                    continue;
                }
                if (!block.isToolCall()) {
                    content.add(block);
                    continue;
                }
                String key = toolCallKey(block);
                if (StringUtils.hasText(key) && resultKeys.containsKey(key)) {
                    content.add(block);
                    retainedToolCallKeys.add(key);
                }
            }
        }
        List<TranscriptMessage> matchedResults = new ArrayList<>();
        Set<String> remainingKeys = new LinkedHashSet<>(retainedToolCallKeys);
        for (TranscriptMessage result : followingResults) {
            String key = toolResultKey(result);
            if (StringUtils.hasText(key) && remainingKeys.remove(key)) {
                matchedResults.add(result);
            }
        }
        TranscriptMessage repairedAssistant = assistant.toBuilder()
            .content(content)
            .build();
        return new ToolPairRepair(repairedAssistant, matchedResults);
    }

    private static boolean isAssistantToolCall(TranscriptMessage message) {
        return sameRole(message, TranscriptMessage.TranscriptRole.ASSISTANT) && !message.toolCalls().isEmpty();
    }

    private static boolean isToolResult(TranscriptMessage message) {
        return sameRole(message, TranscriptMessage.TranscriptRole.TOOL_RESULT);
    }

    private static boolean sameRole(TranscriptMessage message, TranscriptMessage.TranscriptRole expectedRole) {
        return message != null && expectedRole == message.getRole();
    }

    private static String toolCallKey(TranscriptContent block) {
        if (block == null) {
            return null;
        }
        return block.getId();
    }

    private static String toolResultKey(TranscriptMessage message) {
        if (message == null) {
            return null;
        }
        return message.getToolCallId();
    }

    private static boolean isEmpty(TranscriptMessage message) {
        return message == null || message.getRole() == null || !message.hasReplayContent();
    }

    /**
     * Compacted runtime history and the durable checkpoint produced from it.
     */
    public record CompactionResult(List<TranscriptMessage> messages, CompactionCheckpoint checkpoint) {
    }

    /**
     * Durable compaction checkpoint metadata.
     */
    public record CompactionCheckpoint(TranscriptMessage message, Long summarizedThroughSessionSequence,
                                       Long firstKeptSessionSequence) {
    }

    /**
     * Runtime history window and compaction budget.
     */
    public record Policy(long historyTokenBudget, long retainRecentTokens,
                         int summaryTokenBudget) {

        private Policy validated() {
            if (historyTokenBudget <= 0 || retainRecentTokens <= 0 || summaryTokenBudget <= 0) {
                throw new IllegalArgumentException("History compaction token budgets must be positive");
            }
            return this;
        }
    }

    private record ToolPairRepair(TranscriptMessage assistant, List<TranscriptMessage> results) {
    }

    private record CompactedHistory(List<TranscriptMessage> messages, CompactionCheckpoint checkpoint) {
    }

    /**
     * Produces the semantic summary for messages selected by the deterministic compaction policy.
     */
    @FunctionalInterface
    public interface SummaryGenerator {

        String summarize(List<TranscriptMessage> messages, int maxTokens);
    }
}
