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

import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorMutationReceipt;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Pure bounded phase selection; the existing runtime loop owns all IO, approval and execution. */
public final class AgentMonitorBatch {
    /** Per-item persisted progress, never inferred from assistant prose. */
    public enum Status {
        PENDING,
        READY,
        RECEIPT,
        VERIFIED,
        WAITING_APPROVAL,
        FAILED,
        UNCERTAIN,
        REJECTED,
        VALIDATION_FAILED,
        MATCHED_REVIEW,
        UNRESOLVED_REVIEW
    }

    /** Immutable normalized native request plus its durable outcome. */
    public record Item(
            String id,
            String argumentsHash,
            Map<String, Object> arguments,
            Status status,
            Long resourceId,
            String reason) {
        public Item(
                String id,
                String argumentsHash,
                Map<String, Object> arguments,
                Status status,
                Long resourceId) {
            this(id, argumentsHash, arguments, status, resourceId, null);
        }
    }

    /** Bounded checkpoint embedded in the existing transcript. */
    public record Snapshot(String version, String runBinding, String planHash, List<Item> items) {}

    private final String runBinding;
    private final List<Item> items = new ArrayList<>();
    private String planHash;
    private boolean nativeBulk;
    private final Map<String, String> nativeKeys = new LinkedHashMap<>();
    private boolean types;
    private boolean parameters;
    private int segment;
    private boolean readOnlySegment;
    private AgentTaskAssessment.Operation requestedOperation;
    private final java.util.Set<String> lookedUp = new java.util.HashSet<>();
    private final java.util.Set<String> checked = new java.util.HashSet<>();
    private final Map<String, String> liveStatus = new LinkedHashMap<>();
    private final Map<String, String> writeCalls = new LinkedHashMap<>();
    private final Map<String, String> approvals = new LinkedHashMap<>();
    private final Map<String, String> approvalTools = new LinkedHashMap<>();

    String approvalTool(String id) {
        return approvalTools.get(id);
    }

    void recordApproval(AgentRuntimeToolCall call, String approvalId) {
        if (approvalId == null) {
            return;
        }
        for (Item item : items) {
            if (bulkContains(call, item.id())
                    || phase(call.getToolCallId(), item.id() + "-probe")
                    || phase(call.getToolCallId(), item.id() + "-write")) {
                approvals.put(item.id(), approvalId);
                approvalTools.put(item.id(), call.getToolName());
            }
        }
    }

    String displayStatus(Item item) {
        return liveStatus.getOrDefault(item.id(), item.status().name());
    }

    boolean waitingApproval() {
        return liveStatus.containsValue("WAITING_APPROVAL")
                || items.stream().anyMatch(i -> i.status() == Status.WAITING_APPROVAL);
    }

    String writeCallId(String id) {
        return writeCalls.get(id);
    }

    String approvalId(String id) {
        return approvals.get(id);
    }

    boolean hasReceipt(String id) {
        return receipts.containsKey(id);
    }

    void noteStarted(AgentRuntimeToolCall call) {
        for (Item item : items) {
            if (phase(call.getToolCallId(), item.id() + "-probe")) {
                liveStatus.put(item.id(), "VALIDATING");
            }
            if (bulkContains(call, item.id()) && "monitor.create_batch".equals(call.getToolName())
                    || phase(call.getToolCallId(), item.id() + "-write")) {
                liveStatus.put(item.id(), "EXECUTING");
            }
            if ("monitor.get".equals(call.getToolName())
                    && item.resourceId() != null
                    && AgentMonitorMutationSemantics.same(
                            item.resourceId(), call.getArguments().get("monitorId"))) {
                liveStatus.put(item.id(), "CHECKING");
            }
        }
    }

    void noteApproval(AgentRuntimeToolCall call, String approvalId) {
        recordApproval(call, approvalId);
        for (Item item : items) {
            if (bulkContains(call, item.id())
                    || phase(call.getToolCallId(), item.id() + "-probe")
                    || phase(call.getToolCallId(), item.id() + "-write")) {
                liveStatus.put(item.id(), "WAITING_APPROVAL");
                approvals.put(item.id(), approvalId);
            }
        }
    }

    private final Map<String, AgentMonitorMutationReceipt.Target> receipts = new LinkedHashMap<>();

    AgentMonitorBatch(String runUid) {
        runBinding = GatewayText.sha256(runUid);
    }

    void enableNativeBulk() {
        if (active()) {
            throw new IllegalStateException("An active batch execution protocol cannot change");
        }
        nativeBulk = true;
    }

    boolean usesNativeBulk() {
        return nativeBulk;
    }

    boolean active() {
        return planHash != null;
    }

    static boolean requiresPlan(AgentTaskAssessment.Goal goal) {
        return goal != null
                && goal.changesResources()
                && "monitor".equals(goal.resourceType())
                && goal.expectedCount() != null
                && goal.expectedCount() > 1
                && (goal.operation() == AgentTaskAssessment.Operation.CREATE
                        || goal.operation() == AgentTaskAssessment.Operation.UPDATE
                        || goal.operation() == AgentTaskAssessment.Operation.PAUSE
                        || goal.operation() == AgentTaskAssessment.Operation.RESUME);
    }

    void initialize(AgentTaskAssessment.Goal goal) {
        if (!requiresPlan(goal) || !goal.valid() || goal.expectedCount() > 50) {
            throw new IllegalArgumentException("A complete bounded monitor item plan is required");
        }
        operation(goal.operation());
        requestedOperation = goal.operation();
        List<Map<String, Object>> requests = new ArrayList<>();
        if (goal.operation() == AgentTaskAssessment.Operation.CREATE) {
            if (goal.createTargets().size() != goal.expectedCount()) {
                throw new IllegalArgumentException(
                        "Every original website target must be planned before creation");
            }
            for (var target : goal.createTargets()) {
                requests.add(createArguments(goal, target));
            }
            if (requests.stream().map(a -> a.get("name")).distinct().count() != requests.size()
                    || requests.stream().map(a -> a.get("params")).distinct().count()
                            != requests.size()) {
                throw new IllegalArgumentException(
                        "Website target names and effective URLs must be unique");
            }
        } else {
            for (Long id : goal.resourceIds()) {
                requests.add(
                        goal.operation() == AgentTaskAssessment.Operation.UPDATE
                                ? Map.of("monitorId", id, "updates", goal.expectedChanges())
                                : Map.of("monitorIds", List.of(id)));
            }
        }
        var explicitKeys = new java.util.HashSet<String>();
        for (var target : goal.createTargets()) {
            if (target.idempotencyKey() != null
                    && (!target.idempotencyKey().matches("[A-Za-z0-9_.:-]{1,128}")
                            || !explicitKeys.add(target.idempotencyKey()))) {
                throw new PlanException("INVALID_OR_DUPLICATE_IDEMPOTENCY_KEY");
            }
        }
        String name = "monitor." + goal.operation().name().toLowerCase(java.util.Locale.ROOT);
        for (int i = 0; i < requests.size(); i++) {
            Map<String, Object> args = requests.get(i);
            if (!args.equals(GatewaySecretRedactor.redactMap(args))
                    || !AgentMonitorMutationSemantics.permits(goal, name, args)) {
                throw new IllegalArgumentException(
                        "A planned item differs from the original non-secret goal");
            }
            String hash = AgentToolPayloadHasher.normalizedArgumentsHash(args);
            items.add(
                    new Item(
                            "batch-" + runBinding.substring(0, 12) + "-" + i,
                            hash,
                            Map.copyOf(args),
                            Status.PENDING,
                            null));
        }
        for (int i = 0; i < goal.createTargets().size(); i++) {
            String key = goal.createTargets().get(i).idempotencyKey();
            if (key != null) {
                nativeKeys.put(items.get(i).id(), key);
            }
        }
        planHash =
                AgentToolPayloadHasher.normalizedArgumentsHash(
                        Map.of(
                                "operation",
                                goal.operation().name(),
                                "expectedCount",
                                goal.expectedCount(),
                                "items",
                                items.stream()
                                        .map(
                                                item ->
                                                        Map.of(
                                                                "id",
                                                                item.id(),
                                                                "hash",
                                                                item.argumentsHash()))
                                        .toList()));
        if (!nativeKeys.isEmpty()) {
            planHash =
                    AgentToolPayloadHasher.normalizedArgumentsHash(
                            Map.of("plan", planHash, "nativeKeys", nativeKeys));
        }
        if (nativeBulk) {
            if (goal.operation() != AgentTaskAssessment.Operation.CREATE) {
                throw new IllegalArgumentException(
                        "Native batch protocol currently supports website creation only");
            }
            planHash =
                    AgentToolPayloadHasher.normalizedArgumentsHash(
                            Map.of("execution", "monitor-batch.v2", "plan", planHash));
        }
        if (JsonUtil.toJson(snapshot()).getBytes(java.nio.charset.StandardCharsets.UTF_8).length
                > 40000) {
            throw new IllegalArgumentException("Item plan exceeds bounded transcript capacity");
        }
    }

    void restore(AgentTaskAssessment.Goal goal, Snapshot snapshot) {
        nativeBulk = snapshot != null && "monitor-batch.v2".equals(snapshot.version());
        initialize(goal);
        if (snapshot == null
                || !("monitor-batch.v1".equals(snapshot.version())
                        || "monitor-batch.v2".equals(snapshot.version()))
                || !runBinding.equals(snapshot.runBinding())
                || !planHash.equals(snapshot.planHash())
                || snapshot.items().size() != items.size()) {
            throw new IllegalArgumentException(
                    "Batch checkpoint is not bound to this original run and plan");
        }
        // Checkpoint status is advisory. Replay authoritative ledger attempts before choosing
        // another phase.
        for (int i = 0; i < items.size(); i++) {
            Item expected = items.get(i);
            Item saved = snapshot.items().get(i);
            if (!expected.id().equals(saved.id())
                    || !expected.argumentsHash().equals(saved.argumentsHash())
                    || !expected.argumentsHash()
                            .equals(
                                    AgentToolPayloadHasher.normalizedArgumentsHash(
                                            saved.arguments()))) {
                throw new IllegalArgumentException("Persisted item identity or arguments changed");
            }
        }
    }

    Snapshot snapshot() {
        return active()
                ? new Snapshot(
                        nativeBulk ? "monitor-batch.v2" : "monitor-batch.v1",
                        runBinding,
                        planHash,
                        List.copyOf(items))
                : null;
    }

    void startSegment(int ordinal, boolean readOnly) {
        if (ordinal < 1 || ordinal > 64) {
            throw new IllegalArgumentException("Invalid batch segment");
        }
        segment = ordinal;
        readOnlySegment = readOnly;
        liveStatus.clear();
        lookedUp.clear();
        checked.clear();
        for (int i = 0; i < items.size(); i++) {
            Item item = items.get(i);
            if (readOnly
                    && (item.status() == Status.MATCHED_REVIEW
                            || item.status() == Status.UNRESOLVED_REVIEW)) {
                set(i, Status.UNCERTAIN, item.resourceId());
            } else if (!readOnly
                    && (item.status() == Status.REJECTED
                            || item.status() == Status.VALIDATION_FAILED
                            || item.status() == Status.WAITING_APPROVAL
                            || item.status() == Status.READY)) {
                set(i, Status.PENDING, null);
            }
        }
        if (!readOnly && requestedOperation == AgentTaskAssessment.Operation.CREATE) {
            types = false;
            parameters = false;
        }
    }

    AgentRuntimeToolCall next(int remaining) {
        if (!active() || remaining < 1) {
            return null;
        }
        if (nativeBulk) {
            return nextBulk(remaining);
        }
        for (Item item : items) {
            if (item.status() == Status.RECEIPT && !checked.contains(item.id())) {
                return call(
                        item.id() + "-readback",
                        "monitor.get",
                        Map.of("monitorId", item.resourceId()));
            }
            if (segment > 0
                    && readOnlySegment
                    && needsReview(item)
                    && !checked.contains(item.id())) {
                if (item.resourceId() != null) {
                    return call(
                            item.id() + "-readback",
                            "monitor.get",
                            Map.of("monitorId", item.resourceId()));
                }
                if (requestedOperation == AgentTaskAssessment.Operation.CREATE
                        && !lookedUp.contains(item.id())) {
                    return call(
                            item.id() + "-lookup",
                            "monitor.query",
                            Map.of(
                                    "app",
                                    "website",
                                    "search",
                                    item.arguments().get("name"),
                                    "pageIndex",
                                    0,
                                    "pageSize",
                                    2,
                                    "sort",
                                    "id",
                                    "order",
                                    "asc",
                                    "purpose",
                                    "PAGE"));
                }
                Long id = plannedResourceId(item);
                if (id != null) {
                    return call(item.id() + "-readback", "monitor.get", Map.of("monitorId", id));
                }
            }
        }
        if (readOnlySegment || blocked()) {
            return null;
        }
        boolean create = requestedOperation == AgentTaskAssessment.Operation.CREATE;
        if (create && !types) {
            return remaining >= 5 ? call("types", "monitor.types", Map.of()) : null;
        }
        if (create && !parameters) {
            return remaining >= 4
                    ? call("parameters", "monitor.type_params", Map.of("app", "website"))
                    : null;
        }
        for (Item item : items) {
            if (item.status() == Status.VERIFIED) {
                continue;
            }
            if (item.status() == Status.RECEIPT) {
                return null;
            }
            if (create && item.status() == Status.PENDING) {
                return remaining >= 3
                        ? call(item.id() + "-probe", "monitor.detect_draft", probeArguments(item))
                        : null;
            }
            if (remaining < 2) {
                return null;
            }
            return call(item.id() + "-write", mutationTool, item.arguments());
        }
        return null;
    }

    private String nativeKey(Item item) {
        return nativeKeys.getOrDefault(item.id(), item.id());
    }

    int preflightFailureCount() {
        return (int) items.stream().filter(i -> i.status() == Status.VALIDATION_FAILED).count();
    }

    boolean onlyReplayedReceipts() {
        return segment == 0
                && verifiedCount() > 0
                && items.stream()
                        .filter(i -> i.status() == Status.VERIFIED)
                        .allMatch(i -> "NATIVE_IDEMPOTENT_REPLAY".equals(i.reason()))
                && items.stream()
                        .allMatch(
                                i ->
                                        i.status() == Status.VERIFIED
                                                || i.status() == Status.VALIDATION_FAILED);
    }

    boolean onlyPreflightFailuresRemain() {
        return nativeBulk
                && preflightFailureCount() > 0
                && items.stream()
                        .allMatch(
                                i ->
                                        i.status() == Status.VERIFIED
                                                || i.status() == Status.VALIDATION_FAILED);
    }

    private boolean bulkContains(AgentRuntimeToolCall call, String id) {
        return nativeBulk
                && ("monitor.create_batch".equals(call.getToolName())
                        || "monitor.batch_status".equals(call.getToolName()))
                && AgentMonitorBulkArguments.items(call.getArguments()).stream()
                        .anyMatch(
                                item ->
                                        nativeKeys
                                                .getOrDefault(id, id)
                                                .equals(item.get("idempotencyKey")));
    }

    private AgentRuntimeToolCall nextBulk(int remaining) {
        if (remaining < 1 || waitingApproval()) {
            return null;
        }
        boolean reconcile = readOnlySegment || reviewRequired();
        if (!reconcile && items.stream().anyMatch(i -> i.status() == Status.REJECTED)) {
            return null;
        }
        var selected =
                items.stream()
                        .filter(
                                item ->
                                        reconcile
                                                ? needsReview(item) && !checked.contains(item.id())
                                                : item.status() == Status.PENDING)
                        .limit(50)
                        .toList();
        if (selected.isEmpty()) {
            return null;
        }
        return call(
                selected.getFirst().id() + (reconcile ? "-bulk-status" : "-bulk-write"),
                reconcile ? "monitor.batch_status" : "monitor.create_batch",
                Map.of(
                        "items",
                        selected.stream()
                                .map(
                                        item ->
                                                AgentMonitorBulkArguments.item(
                                                        nativeKey(item), item.arguments()))
                                .toList(),
                        "retryPreflightFailures",
                        !reconcile && segment > 0));
    }

    private void observeBulk(
            AgentRuntimeToolCall call,
            AgentToolStatus status,
            String output,
            String trustedHash,
            boolean durable) {
        Map<String, Object> arguments = call.getArguments();
        var submitted = AgentMonitorBulkArguments.items(arguments);
        if (submitted.isEmpty()
                && arguments.isEmpty()
                && "monitor.create_batch".equals(call.getToolName())) {
            // Replay never restores private mutation input JSON. Reconstruct only already-frozen,
            // non-secret items, then require the exact original durable argument hash below.
            Map<String, Object> replay = object(output);
            if (replay != null
                    && replay.get("batch") instanceof Map<?, ?> batch
                    && batch.get("items") instanceof List<?> results
                    && !results.isEmpty()
                    && results.size() <= 50) {
                List<Map<String, Object>> reconstructed = new ArrayList<>();
                for (Object value : results) {
                    if (!(value instanceof Map<?, ?> row)
                            || !(row.get("idempotencyKey") instanceof String key)) {
                        return;
                    }
                    Item item =
                            items.stream()
                                    .filter(i -> key.equals(nativeKey(i)))
                                    .findFirst()
                                    .orElse(null);
                    if (item == null) {
                        return;
                    }
                    reconstructed.add(AgentMonitorBulkArguments.item(key, item.arguments()));
                }
                String firstKey = String.valueOf(reconstructed.getFirst().get("idempotencyKey"));
                String firstId =
                        items.stream()
                                .filter(i -> firstKey.equals(nativeKey(i)))
                                .findFirst()
                                .orElseThrow()
                                .id();
                if (!phase(call.getToolCallId(), firstId + "-bulk-write")) {
                    return;
                }
                arguments =
                        Map.of(
                                "items",
                                List.copyOf(reconstructed),
                                "retryPreflightFailures",
                                call.getToolCallId().contains("-segment-"));
                submitted = AgentMonitorBulkArguments.items(arguments);
            }
        }
        if (submitted.isEmpty()) {
            return;
        }
        var selected = new java.util.HashSet<String>();
        for (var raw : submitted) {
            String key = (String) raw.get("idempotencyKey");
            var planned =
                    items.stream().filter(i -> key.equals(nativeKey(i))).findFirst().orElse(null);
            if (planned == null
                    || !AgentMonitorMutationSemantics.same(
                            AgentMonitorBulkArguments.item(key, planned.arguments()), raw)) {
                return;
            }
            selected.add(key);
        }
        boolean readOnly = "monitor.batch_status".equals(call.getToolName());
        boolean bound =
                durable
                        && status == AgentToolStatus.SUCCEEDED
                        && trustedHash != null
                        && trustedHash.equals(
                                AgentToolPayloadHasher.normalizedArgumentsHash(arguments));
        Map<String, Object> data = object(output);
        Map<?, ?> batch =
                data != null && data.get("batch") instanceof Map<?, ?> map ? map : Map.of();
        List<?> results = batch.get("items") instanceof List<?> list ? list : List.of();
        bound &=
                data != null
                        && "monitor-bulk.v1".equals(data.get("batchVersion"))
                        && results.size() == submitted.size();
        var seen = new java.util.HashSet<Object>();
        for (Object value : results) {
            if (!(value instanceof Map<?, ?> result)
                    || !selected.contains(result.get("idempotencyKey"))
                    || !seen.add(result.get("idempotencyKey"))) {
                bound = false;
            }
        }
        for (int i = 0; i < items.size(); i++) {
            Item item = items.get(i);
            if (!selected.contains(nativeKey(item))) {
                continue;
            }
            if (!readOnly) {
                writeCalls.put(item.id(), call.getToolCallId());
            }
            if (!bound) {
                set(
                        i,
                        status == AgentToolStatus.WAITING_APPROVAL
                                ? Status.WAITING_APPROVAL
                                : status == AgentToolStatus.DENIED
                                        ? Status.REJECTED
                                        : Status.UNCERTAIN,
                        item.resourceId(),
                        "BATCH_RESULT_UNAVAILABLE");
                if (readOnly) {
                    checked.add(item.id());
                }
                continue;
            }
            Map<?, ?> result =
                    (Map<?, ?>)
                            results.stream()
                                    .filter(
                                            v ->
                                                    v instanceof Map<?, ?> map
                                                            && nativeKey(item)
                                                                    .equals(
                                                                            map.get(
                                                                                    "idempotencyKey")))
                                    .findFirst()
                                    .orElseThrow();
            String state = String.valueOf(result.get("state"));
            Long id = AgentMonitorBulkArguments.monitorId(result.get("monitorId"));
            var receipt =
                    AgentMonitorMutationSemantics.parse("monitor.create_batch", data, trustedHash);
            var target =
                    receipt == null || id == null
                            ? null
                            : receipt.targets().stream()
                                    .filter(t -> id.equals(t.monitorId()))
                                    .findFirst()
                                    .orElse(null);
            if ("VERIFIED".equals(state)
                    && target != null
                    && AgentMonitorBulkArguments.targetMatches(target, item.arguments())
                    && AgentMonitorMutationSemantics.same(target.fields(), result.get("fields"))
                    && AgentMonitorMutationSemantics.same(
                            target.parameters(), result.get("parameters"))) {
                receipts.put(item.id(), target);
                checked.add(item.id());
                set(
                        i,
                        Status.VERIFIED,
                        id,
                        "NATIVE_IDEMPOTENT_REPLAY".equals(result.get("reason"))
                                ? "NATIVE_IDEMPOTENT_REPLAY"
                                : null);
            } else if ("PROBE_FAILED".equals(state)
                    && (item.status() == Status.UNCERTAIN
                            || "EXECUTION_NO_LONGER_ACTIVE".equals(result.get("reason")))) {
                set(i, Status.UNCERTAIN, id, "NATIVE_BATCH_OUTCOME_UNKNOWN");
                if (readOnly) checked.add(item.id());
            } else if ("PROBE_FAILED".equals(state)
                    || "INVALID".equals(state)
                    || "CONFLICT".equals(state)) {
                String reason =
                        result.get("reason") instanceof String code
                                        && code.matches(
                                                "HTTP_[1-5][0-9]{2}|NATIVE_AVAILABILITY_FAILED|NATIVE_VALIDATION_FAILED|IDEMPOTENCY_ARGUMENT_CONFLICT|EXECUTION_NO_LONGER_ACTIVE")
                                ? code
                                : "NATIVE_PREFLIGHT_FAILED";
                set(i, Status.VALIDATION_FAILED, null, reason);
            } else if ("NOT_STARTED".equals(state)) {
                set(i, Status.PENDING, null, "NO_NATIVE_WRITE_CLAIM");
            } else {
                set(i, Status.UNCERTAIN, id, "NATIVE_BATCH_OUTCOME_UNKNOWN");
                if (readOnly) {
                    checked.add(item.id());
                }
            }
        }
    }

    private Map<String, Object> probeArguments(Item item) {
        Map<String, String> params = new LinkedHashMap<>();
        ((Map<?, ?>) item.arguments().get("params"))
                .forEach((k, v) -> params.put(k.toString(), v.toString()));
        return Map.of("app", "website", "parameters", params);
    }

    private Long plannedResourceId(Item item) {
        if (requestedOperation == AgentTaskAssessment.Operation.UPDATE) {
            return AgentBatchReconciliation.positiveId(item.arguments().get("monitorId"));
        }
        if (item.arguments().get("monitorIds") instanceof List<?> ids && ids.size() == 1) {
            return AgentBatchReconciliation.positiveId(ids.getFirst());
        }
        return null;
    }

    private boolean needsReview(Item item) {
        return item.status() == Status.UNCERTAIN
                || item.status() == Status.FAILED
                || item.status() == Status.MATCHED_REVIEW
                || item.status() == Status.UNRESOLVED_REVIEW;
    }

    boolean reviewRequired() {
        return items.stream().anyMatch(this::needsReview);
    }

    int verifiedCount() {
        return (int) items.stream().filter(i -> i.status() == Status.VERIFIED).count();
    }

    int receiptCount() {
        return (int) items.stream().filter(i -> receipts.containsKey(i.id())).count();
    }

    boolean hasPending() {
        return items.stream()
                .anyMatch(
                        i ->
                                i.status() == Status.PENDING
                                        || i.status() == Status.READY
                                        || i.status() == Status.REJECTED
                                        || i.status() == Status.VALIDATION_FAILED
                                        || i.status() == Status.WAITING_APPROVAL
                                        || i.status() == Status.RECEIPT);
    }

    private String mutationTool;

    void operation(AgentTaskAssessment.Operation operation) {
        mutationTool = "monitor." + operation.name().toLowerCase(java.util.Locale.ROOT);
    }

    boolean blocked() {
        return items.stream()
                .anyMatch(
                        i ->
                                needsReview(i)
                                        || i.status() == Status.WAITING_APPROVAL
                                        || i.status() == Status.REJECTED
                                        || i.status() == Status.VALIDATION_FAILED);
    }

    boolean finished() {
        return active() && verifiedCount() == items.size();
    }

    void observe(
            AgentRuntimeToolCall call,
            AgentToolRisk risk,
            AgentToolStatus status,
            String output,
            String trustedHash,
            boolean durable) {
        if (!active()) {
            return;
        }
        if (nativeBulk
                && ("monitor.create_batch".equals(call.getToolName())
                        || "monitor.batch_status".equals(call.getToolName()))) {
            observeBulk(call, status, output, trustedHash, durable);
            return;
        }
        if (phase(call.getToolCallId(), "batch-" + runBinding.substring(0, 12) + "-types")
                && "monitor.types".equals(call.getToolName())) {
            types = durable && status == AgentToolStatus.SUCCEEDED;
            if (!types) {
                failFirst();
            }
            return;
        }
        if (phase(call.getToolCallId(), "batch-" + runBinding.substring(0, 12) + "-parameters")
                && "monitor.type_params".equals(call.getToolName())) {
            parameters = durable && status == AgentToolStatus.SUCCEEDED;
            if (!parameters) {
                failFirst();
            }
            return;
        }
        for (int i = 0; i < items.size(); i++) {
            Item item = items.get(i);
            if (phase(call.getToolCallId(), item.id() + "-probe")
                    && "monitor.detect_draft".equals(call.getToolName())) {
                boolean bound =
                        AgentToolPayloadHasher.normalizedArgumentsHash(probeArguments(item))
                                .equals(trustedHash);
                set(
                        i,
                        durable && status == AgentToolStatus.SUCCEEDED && bound
                                ? Status.READY
                                : status == AgentToolStatus.WAITING_APPROVAL
                                        ? Status.WAITING_APPROVAL
                                        : status == AgentToolStatus.DENIED
                                                ? Status.REJECTED
                                                : Status.VALIDATION_FAILED,
                        null);
                return;
            }
            if (phase(call.getToolCallId(), item.id() + "-write")
                    && mutationTool.equals(call.getToolName())) {
                observeWrite(i, item, call, status, output, trustedHash, durable);
                return;
            }
            if (phase(call.getToolCallId(), item.id() + "-lookup")
                    && "monitor.query".equals(call.getToolName())) {
                lookedUp.add(item.id());
                Long id =
                        durable && status == AgentToolStatus.SUCCEEDED
                                ? AgentBatchReconciliation.uniqueCandidate(item, object(output))
                                : null;
                set(
                        i,
                        id == null ? Status.UNRESOLVED_REVIEW : Status.UNCERTAIN,
                        id,
                        id == null ? "LOOKUP_NOT_CONCLUSIVE" : "CANDIDATE_FOUND");
                if (id == null) {
                    checked.add(item.id());
                }
                return;
            }
            Long expectedId =
                    item.resourceId() == null ? plannedResourceId(item) : item.resourceId();
            if (expectedId != null
                    && "monitor.get".equals(call.getToolName())
                    && AgentMonitorMutationSemantics.same(
                            expectedId, call.getArguments().get("monitorId"))) {
                if (item.status() == Status.VERIFIED) {
                    continue;
                }
                observeReadback(
                        i,
                        item,
                        expectedId,
                        status,
                        output,
                        durable,
                        phase(call.getToolCallId(), item.id() + "-readback")
                                && call.getToolCallId().contains("-segment-"));
                return;
            }
        }
    }

    private void observeWrite(
            int index,
            Item item,
            AgentRuntimeToolCall call,
            AgentToolStatus status,
            String output,
            String hash,
            boolean durable) {
        writeCalls.put(item.id(), call.getToolCallId());
        liveStatus.remove(item.id());
        var receipt =
                durable && status == AgentToolStatus.SUCCEEDED && item.argumentsHash().equals(hash)
                        ? AgentMonitorMutationSemantics.parse(
                                call.getToolName(), object(output), hash)
                        : null;
        if (receipt != null
                && receipt.targets().size() == 1
                && AgentMonitorMutationSemantics.matchesRequest(receipt, item.arguments())) {
            var target = receipt.targets().getFirst();
            receipts.put(item.id(), target);
            checked.remove(item.id());
            set(index, Status.RECEIPT, target.monitorId());
            return;
        }
        set(
                index,
                status == AgentToolStatus.WAITING_APPROVAL
                        ? Status.WAITING_APPROVAL
                        : status == AgentToolStatus.DENIED ? Status.REJECTED : Status.UNCERTAIN,
                plannedResourceId(item),
                status == AgentToolStatus.DENIED ? "NOT_EXECUTED" : "WRITE_UNCERTAIN");
    }

    private void observeReadback(
            int index,
            Item item,
            Long id,
            AgentToolStatus status,
            String output,
            boolean durable,
            boolean explicitReconciliation) {
        checked.add(item.id());
        Map<String, Object> data = object(output);
        var receipt = receipts.get(item.id());
        if (durable
                && status == AgentToolStatus.SUCCEEDED
                && AgentBatchReconciliation.matches(receipt, data)) {
            set(index, Status.VERIFIED, id);
            return;
        }
        var expected = AgentBatchReconciliation.expected(item, requestedOperation, id);
        if ((explicitReconciliation || segment > 0 && readOnlySegment)
                && durable
                && status == AgentToolStatus.SUCCEEDED
                && AgentBatchReconciliation.matches(expected, data)) {
            if (requestedOperation == AgentTaskAssessment.Operation.CREATE) {
                set(index, Status.MATCHED_REVIEW, id, "MATCH_IS_NOT_CREATION_PROOF");
            } else {
                receipts.put(item.id(), expected);
                set(index, Status.VERIFIED, id, "STATE_RECONCILED");
            }
            return;
        }
        set(index, Status.UNRESOLVED_REVIEW, id, "READBACK_NOT_CONCLUSIVE");
    }

    private boolean phase(String actual, String expected) {
        return expected.equals(actual)
                || actual != null
                        && actual.startsWith(expected + "-segment-")
                        && actual.substring((expected + "-segment-").length())
                                .matches("[1-9][0-9]?");
    }

    List<String> failureCodes() {
        return items.stream()
                .filter(item -> item.status() == Status.VALIDATION_FAILED)
                .map(Item::reason)
                .filter(java.util.Objects::nonNull)
                .filter(
                        reason ->
                                reason.matches(
                                        "HTTP_[1-5][0-9]{2}|NATIVE_AVAILABILITY_FAILED|NATIVE_VALIDATION_FAILED|NATIVE_PREFLIGHT_FAILED|IDEMPOTENCY_ARGUMENT_CONFLICT|EXECUTION_NO_LONGER_ACTIVE"))
                .distinct()
                .sorted()
                .limit(20)
                .toList();
    }

    String summary() {
        var counts = new java.util.EnumMap<Status, Integer>(Status.class);
        items.forEach(item -> counts.merge(item.status(), 1, Integer::sum));
        return "MONITOR_BATCH_STATE: "
                + JsonUtil.toJson(counts)
                + "; failureCodes="
                + JsonUtil.toJson(failureCodes())
                + ". Original item plan and tool budget are unchanged. Return a truthful final"
                + " answer using this progress. Do not request additional tools or repeat writes.";
    }

    void failPlanning() {
        failFirst();
    }

    void reconcileSaved(Snapshot saved) {
        for (int i = 0; i < items.size(); i++) {
            var previous = saved.items().get(i);
            var current = items.get(i);
            if (needsReview(previous) && current.status() != Status.VERIFIED
                    || previous.resourceId() != null
                            && !java.util.Objects.equals(
                                    previous.resourceId(), current.resourceId())
                    || previous.status() == Status.VERIFIED && current.status() != Status.VERIFIED
                    || previous.status() == Status.RECEIPT
                            && current.status() != Status.RECEIPT
                            && current.status() != Status.VERIFIED) {
                set(i, Status.UNCERTAIN, current.resourceId(), "LEDGER_SNAPSHOT_MISMATCH");
            }
        }
    }

    private void failFirst() {
        if (!items.isEmpty()) {
            set(0, Status.VALIDATION_FAILED, null);
        }
    }

    private void set(int index, Status status, Long id) {
        set(index, status, id, null);
    }

    private void set(int index, Status status, Long id, String reason) {
        var item = items.get(index);
        liveStatus.remove(item.id());
        items.set(
                index,
                new Item(item.id(), item.argumentsHash(), item.arguments(), status, id, reason));
    }

    private AgentRuntimeToolCall call(String id, String name, Map<String, Object> args) {
        String key =
                id.startsWith("batch-") ? id : "batch-" + runBinding.substring(0, 12) + "-" + id;
        if (segment > 0) {
            key += "-segment-" + segment;
        }
        return AgentRuntimeToolCall.builder()
                .toolCallId(key)
                .toolName(name)
                .arguments(args)
                .build();
    }

    private static Map<String, Object> object(String text) {
        return AgentBatchReconciliation.object(text);
    }

    static Map<String, Object> createArguments(
            AgentTaskAssessment.Goal goal, AgentTaskAssessment.CreateTarget target) {
        if (target == null
                || target.name() == null
                || target.name().isBlank()
                || target.name().length() > 100
                || target.url() == null
                || target.url().length() > 2048
                || target.intervals() == null
                || target.intervals() < 1) {
            throw new IllegalArgumentException(
                    "Complete website name, URL and positive interval are required");
        }
        URI uri = URI.create(target.url()).normalize();
        String scheme = uri.getScheme();
        if (!("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                || uri.getHost() == null
                || uri.getUserInfo() != null
                || uri.getFragment() != null
                || uri.getPort() > 65535
                || uri.getRawQuery() != null) {
            throw new IllegalArgumentException(
                    "Website plans require credential-free HTTP URLs without queries or fragments");
        }
        boolean ssl = "https".equalsIgnoreCase(scheme);
        int port = uri.getPort() < 0 ? ssl ? 443 : 80 : uri.getPort();
        if (port < 1) {
            throw new IllegalArgumentException("Website port must be positive");
        }
        String path = uri.getRawPath();
        if (path == null || path.isEmpty()) {
            path = "/";
        }
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("host", uri.getHost().toLowerCase(java.util.Locale.ROOT));
        params.put("port", port);
        params.put("ssl", ssl);
        params.put("uri", path);
        Map<String, Object> args = new LinkedHashMap<>();
        if (target.timeout() != null) {
            if (target.timeout() < 1 || target.timeout() > 10000) {
                throw new PlanException("INVALID_TIMEOUT");
            }
            params.put("timeout", target.timeout());
        }
        args.put("name", target.name().trim());
        args.put("app", "website");
        args.put("intervals", target.intervals());
        for (var change : sharedChanges(goal).entrySet()) {
            if (!"params".equals(change.getKey())) {
                if (!args.containsKey(change.getKey())
                        || !AgentMonitorMutationSemantics.same(
                                change.getValue(), args.get(change.getKey()))) {
                    throw new PlanException("SHARED_FIELD_CONFLICT");
                }
                continue;
            }
            if (!(change.getValue() instanceof Map<?, ?> shared)) {
                throw new PlanException("INVALID_SHARED_PARAMETERS");
            }
            for (var param : shared.entrySet()) {
                if (!(param.getKey() instanceof String field)
                        || !AgentMonitorMutationReceipt.WEBSITE_FIELDS.contains(field)) {
                    throw new PlanException("UNSUPPORTED_SHARED_PARAMETER");
                }
                if ("timeout".equals(field)) {
                    try {
                        if (!(param.getValue() instanceof Number
                                || param.getValue() instanceof String)) {
                            throw new NumberFormatException();
                        }
                        int timeout =
                                new java.math.BigDecimal(param.getValue().toString())
                                        .intValueExact();
                        if (timeout < 1) {
                            throw new NumberFormatException();
                        }
                        if (params.containsKey(field)
                                && !AgentMonitorMutationSemantics.same(
                                        params.get(field), timeout)) {
                            throw new PlanException("SHARED_PARAMETER_CONFLICT");
                        }
                        params.put(field, timeout);
                    } catch (ArithmeticException | NumberFormatException invalid) {
                        throw new PlanException("INVALID_TIMEOUT");
                    }
                } else if (!AgentMonitorMutationSemantics.same(
                        param.getValue(), params.get(field))) {
                    throw new PlanException("SHARED_PARAMETER_CONFLICT");
                }
            }
        }
        args.put("params", Map.copyOf(params));
        return Map.copyOf(args);
    }

    private static Map<String, Object> sharedChanges(AgentTaskAssessment.Goal goal) {
        Map<String, Object> fields = new LinkedHashMap<>();
        Map<String, Object> params = new LinkedHashMap<>();
        Object rawParams = goal.expectedChanges().get("params");
        if (rawParams != null) {
            if (!(rawParams instanceof Map<?, ?> nested)) {
                throw new PlanException("INVALID_SHARED_PARAMETERS");
            }
            for (var entry : nested.entrySet()) {
                if (!(entry.getKey() instanceof String field)
                        || !AgentMonitorMutationReceipt.WEBSITE_FIELDS.contains(field)) {
                    throw new PlanException("UNSUPPORTED_SHARED_PARAMETER");
                }
                params.put(field, entry.getValue());
            }
        }
        for (var entry : goal.expectedChanges().entrySet()) {
            String field = entry.getKey();
            Object value = entry.getValue();
            if ("params".equals(field)) {
                continue;
            }
            if ("protocol".equals(field) || "scheme".equals(field)) {
                if (!(value instanceof String protocol)
                        || !("http".equalsIgnoreCase(protocol)
                                || "https".equalsIgnoreCase(protocol))) {
                    throw new PlanException("INVALID_PROTOCOL");
                }
                field = "ssl";
                value = "https".equalsIgnoreCase(protocol);
            } else if ("path".equals(field)) {
                field = "uri";
            }
            if (AgentMonitorMutationReceipt.WEBSITE_FIELDS.contains(field)) {
                if (params.containsKey(field)
                        && !AgentMonitorMutationSemantics.same(params.get(field), value)) {
                    throw new PlanException("CONFLICTING_PARAMETER_REPRESENTATIONS");
                }
                params.put(field, value);
            } else {
                fields.put(field, value);
            }
        }
        if (!params.isEmpty()) {
            fields.put("params", params);
        }
        return fields;
    }

    /** Names are allowlisted; arbitrary model keys and all values stay out of diagnostics. */
    static Map<String, Object> planStructure(AgentTaskAssessment.Goal goal) {
        var allowed =
                java.util.Set.of(
                        "name",
                        "app",
                        "intervals",
                        "params",
                        "host",
                        "port",
                        "ssl",
                        "uri",
                        "timeout",
                        "protocol",
                        "scheme",
                        "path",
                        "description",
                        "labels");
        Map<String, Object> structure = new LinkedHashMap<>();
        int unknownFields = 0;
        for (var entry : goal.expectedChanges().entrySet()) {
            if (!allowed.contains(entry.getKey())) {
                unknownFields++;
                continue;
            }
            Object value = entry.getValue();
            structure.put(
                    entry.getKey(),
                    value == null
                            ? "null"
                            : value instanceof Map
                                    ? "object"
                                    : value instanceof List
                                            ? "array"
                                            : value instanceof Number
                                                    ? "number"
                                                    : value instanceof Boolean
                                                            ? "boolean"
                                                            : value instanceof String
                                                                    ? "string"
                                                                    : "other");
        }
        structure.put("unknownFieldCount", unknownFields);
        return Map.copyOf(structure);
    }

    /** Fixed non-sensitive rule, never the offending value. */
    static final class PlanException extends IllegalArgumentException {
        private final String rule;

        PlanException(String rule) {
            super(rule);
            this.rule = rule;
        }

        String rule() {
            return rule;
        }
    }
}
