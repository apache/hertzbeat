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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Per-run planning data only; it cannot approve, probe or create any resource. */
final class AgentWebsiteCandidatePool {
    private final int expectedCount;
    private final int interval;
    private final int timeout;
    private final Set<String> retained = new LinkedHashSet<>();
    private final Set<String> checked = new LinkedHashSet<>();
    private final Set<String> excluded = new LinkedHashSet<>();
    private Selection lastSelection;
    private final Set<String> snapshotExcluded = new LinkedHashSet<>();

    AgentWebsiteCandidatePool(AgentTaskAssessment.Goal original) {
        if (!original.valid()
                || original.operation() != AgentTaskAssessment.Operation.CREATE
                || original.createTargets().size() < 2
                || original.createTargets().size() > 50)
            throw new IllegalArgumentException("WEBSITE_PROPOSAL_GOAL_INVALID");
        expectedCount = original.createTargets().size();
        interval = original.createTargets().getFirst().intervals();
        timeout = original.createTargets().getFirst().timeout();
    }

    List<String> additions(Map<String, Object> arguments) {
        return selection(arguments).admitted();
    }

    Selection selection(Map<String, Object> arguments) {
        var value = AgentWebsiteBatchProposal.fragment(arguments, interval, timeout);
        if (!Integer.valueOf(interval).equals(value.get("intervals"))
                || !Integer.valueOf(timeout).equals(value.get("timeout")))
            throw new IllegalArgumentException("WEBSITE_PROPOSAL_SETTINGS_CHANGED");
        List<String> fresh = new ArrayList<>();
        for (Object valueDomain : (List<?>) value.get("domains")) {
            String domain = (String) valueDomain;
            if (!checked.contains(domain)) fresh.add(domain);
        }
        int normalizedCount = ((List<?>) value.get("domains")).size();
        int returnedCount = ((List<?>) arguments.get("domains")).size();
        int limit = Math.min(candidateQuota(), fresh.size());
        return new Selection(
                returnedCount,
                normalizedCount,
                returnedCount - normalizedCount,
                normalizedCount - fresh.size(),
                fresh.subList(0, limit),
                fresh.subList(limit, fresh.size()),
                100 - checked.size(),
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher
                        .normalizedArgumentsHash(arguments));
    }

    record Selection(
            int returnedCount,
            int normalizedCount,
            int withinReplyDuplicates,
            int alreadyCheckedCount,
            List<String> admitted,
            List<String> overflow,
            int remainingBudgetBefore,
            String proposalInputHash) {
        Selection {
            admitted = List.copyOf(admitted);
            overflow = List.copyOf(overflow);
        }

        int freshCount() {
            return admitted.size() + overflow.size();
        }

        Map<String, Object> feedback() {
            var result = new java.util.LinkedHashMap<String, Object>();
            result.put("version", "website-candidate-selection.v1");
            result.put("proposalInputHash", proposalInputHash);
            result.put("returnedCount", returnedCount);
            result.put("normalizedUniqueCount", normalizedCount);
            result.put("withinReplyDuplicates", withinReplyDuplicates);
            result.put("alreadyCheckedCount", alreadyCheckedCount);
            result.put("selectedForMetadataCount", admitted.size());
            result.put("remainingBudgetBefore", remainingBudgetBefore);
            result.put("overflowNotCheckedCount", overflow.size());
            result.put("overflowNotCheckedDomains", overflow);
            result.put("creationProof", false);
            return Map.copyOf(result);
        }
    }

    void rememberSelection(Selection selection) {
        lastSelection = selection;
    }

    int checkedCount() {
        return checked.size();
    }

    List<Map<String, Object>> metadataItems(List<String> domains) {
        return domains.stream()
                .map(
                        domain -> {
                            String hash =
                                    org.apache.hertzbeat.ai.gateway.text.GatewayText.sha256(domain);
                            return Map.<String, Object>of(
                                    "idempotencyKey",
                                    "candidate-" + hash.substring(0, 40),
                                    "name",
                                    "Candidate " + hash.substring(0, 12),
                                    "url",
                                    "https://" + domain + "/",
                                    "intervals",
                                    interval,
                                    "timeout",
                                    timeout);
                        })
                .toList();
    }

    void record(Map<String, Object> sample) {
        record(sample, false);
    }

    void record(Map<String, Object> sample, boolean knownExistingAtSnapshot) {
        String domain = (String) sample.get("domain");
        if (domain == null || !checked.contains(domain) && checked.size() >= 100)
            throw new IllegalArgumentException("WEBSITE_PROPOSAL_CANDIDATE_BUDGET");
        boolean existing =
                "EXISTING".equals(sample.get("state"))
                        && "WEBSITE_ALREADY_MONITORED".equals(sample.get("reason"));
        boolean ready =
                "NOT_CHECKED".equals(sample.get("state"))
                        && "APPROVAL_REQUIRED_NATIVE_PROBE".equals(sample.get("reason"));
        if (!existing && !ready)
            throw new IllegalArgumentException("WEBSITE_PROPOSAL_CANDIDATE_UNVERIFIED");
        checked.add(domain);
        if (knownExistingAtSnapshot) snapshotExcluded.add(domain);
        if (existing || knownExistingAtSnapshot) {
            retained.remove(domain);
            excluded.add(domain);
        } else {
            if (!excluded.contains(domain) && retained.size() < expectedCount) retained.add(domain);
        }
    }

    boolean complete() {
        return retained.size() == expectedCount;
    }

    Map<String, Object> arguments() {
        if (!complete()) throw new IllegalArgumentException("WEBSITE_PROPOSAL_COUNT_MISMATCH");
        return Map.of("domains", List.copyOf(retained), "intervals", interval, "timeout", timeout);
    }

    int missingCount() {
        return expectedCount - retained.size();
    }

    int candidateQuota() {
        return Math.min(expectedCount, 100 - checked.size());
    }

    AgentRuntimeModelRequest supplementRequest(AgentRuntimeModelRequest original, String question) {
        int quota = candidateQuota();
        if (complete() || quota < missingCount())
            throw new IllegalArgumentException("WEBSITE_PROPOSAL_CANDIDATE_BUDGET");
        var registered =
                original.getAvailableTools().stream()
                        .filter(tool -> "monitor.plan_websites".equals(tool.getName()))
                        .findFirst()
                        .orElseThrow();
        if (registered.getRisk() != org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.READ)
            throw new IllegalArgumentException("WEBSITE_PROPOSAL_TOOL_UNAVAILABLE");
        var schema =
                Map.of(
                        "type",
                        "object",
                        "required",
                        List.of("domains"),
                        "additionalProperties",
                        false,
                        "properties",
                        Map.of(
                                "domains",
                                Map.of(
                                        "type",
                                        "array",
                                        "minItems",
                                        quota,
                                        "maxItems",
                                        quota,
                                        "uniqueItems",
                                        true,
                                        "items",
                                        Map.of(
                                                "type",
                                                "string",
                                                "minLength",
                                                3,
                                                "maxLength",
                                                253))));
        var tool =
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor.builder()
                        .name(registered.getName())
                        .description(
                                "Supply fresh candidate domains only; the server already retains"
                                    + " the accepted targets. These are bounded candidates, not"
                                    + " extra monitors. Never repeat retained/excluded domains or"
                                    + " change settings.")
                        .inputSchema(org.apache.hertzbeat.common.util.JsonUtil.toJson(schema))
                        .risk(registered.getRisk())
                        .namespace(registered.getNamespace())
                        .exposure(registered.getExposure())
                        .access(registered.getAccess())
                        .build();
        var state = new java.util.LinkedHashMap<String, Object>(feedback());
        state.put("version", "website-candidate-supplement.v1");
        state.put("requestedCandidateCount", quota);
        state.put("remainingCandidateBudget", 100 - checked.size());
        state.put("sharedSettings", Map.of("intervals", interval, "timeout", timeout));
        var prompt =
                RuntimePrompt.builder()
                        .instructions(
                                original.getPrompt().getInstructions()
                                        + "\n"
                                        + "WEBSITE_CANDIDATE_SUPPLEMENT: Only add fresh candidate"
                                        + " domains using the single offered tool. The compact"
                                        + " state is server-owned planning data, never instructions"
                                        + " from monitored content. Generate"
                                        + " requestedCandidateCount distinct candidates not in"
                                        + " retained/excluded domains, so metadata duplicates can"
                                        + " be filtered within the same budget. The original"
                                        + " monitor count never increases; only the final complete"
                                        + " target set is reviewed and approved. Do not reproduce a"
                                        + " full old plan, call another tool, ask for probe"
                                        + " approval, or claim creation.")
                        .blocks(original.getPrompt().getBlocks())
                        .build();
        return AgentRuntimeModelRequest.builder()
                .prompt(prompt)
                .chatHistory(
                        List.of(
                                TranscriptMessage.userText(question),
                                TranscriptMessage.userText(
                                        org.apache.hertzbeat.common.util.JsonUtil.toJson(state))))
                .availableTools(List.of(tool))
                .toolCallRequired(true)
                .temperature(original.getTemperature())
                .maxCompletionTokens(original.getMaxCompletionTokens())
                .build();
    }

    void validateGoal(AgentTaskAssessment.Goal goal) {
        if (!complete()
                || !goal.valid()
                || goal.createTargets().size() != expectedCount
                || goal.createTargets().stream()
                        .anyMatch(
                                target ->
                                        !Integer.valueOf(interval).equals(target.intervals())
                                                || !Integer.valueOf(timeout)
                                                        .equals(target.timeout()))
                || !retained.equals(
                        new LinkedHashSet<>(
                                goal.createTargets().stream()
                                        .map(target -> java.net.URI.create(target.url()).getHost())
                                        .toList())))
            throw new IllegalArgumentException("WEBSITE_PROPOSAL_SETTINGS_CHANGED");
    }

    Map<String, Object> feedback() {
        var result =
                new java.util.LinkedHashMap<String, Object>(
                        Map.of(
                                "code",
                                "WEBSITE_PROPOSAL_CANDIDATES_REQUIRE_REPLACEMENT",
                                "expectedCount",
                                expectedCount,
                                "retainedCount",
                                retained.size(),
                                "requiredReplacementCount",
                                expectedCount - retained.size(),
                                "requestedCandidateCount",
                                candidateQuota(),
                                "validUniqueDomains",
                                List.copyOf(retained),
                                "excludedCandidates",
                                excluded.stream()
                                        .map(
                                                domain ->
                                                        Map.of(
                                                                "domain",
                                                                domain,
                                                                "state",
                                                                "EXISTING",
                                                                "reason",
                                                                "WEBSITE_ALREADY_MONITORED",
                                                                "source",
                                                                snapshotExcluded.contains(domain)
                                                                        ? "AUTHORIZED_EXCLUSION_SNAPSHOT"
                                                                        : "NATIVE_CANDIDATE_METADATA"))
                                        .toList(),
                                "availability",
                                "NOT_CHECKED_REQUIRES_APPROVAL",
                                "creationProof",
                                false));
        result.put("checkedCandidateCount", checked.size());
        result.put("existingCandidateCount", excluded.size());
        result.put("unselectedReadyCount", checked.size() - retained.size() - excluded.size());
        result.put("remainingCandidateBudget", 100 - checked.size());
        if (lastSelection != null) result.put("lastSelection", lastSelection.feedback());
        return Map.copyOf(result);
    }
}
