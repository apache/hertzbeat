/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.batch;

import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Native bounded batch boundary. A failed probe never blocks independent items or authorizes a
 * write.
 */
@Service
public class WebsiteMonitorBatchService implements AutoCloseable {
    private final WebsiteMonitorBatchItemDao items;
    private final MonitorService monitors;

    private static final int CONCURRENCY = 10;
    private static final long MAX_EXECUTION_NANOS = java.time.Duration.ofSeconds(55).toNanos();
    private final long executionNanos;
    private final java.util.concurrent.atomic.AtomicBoolean closed =
            new java.util.concurrent.atomic.AtomicBoolean();
    private final java.util.concurrent.ExecutorService executor;

    private org.apache.hertzbeat.manager.dao.ParamDao params;

    @org.springframework.beans.factory.annotation.Autowired
    public WebsiteMonitorBatchService(
            WebsiteMonitorBatchItemDao items,
            MonitorService monitors,
            org.apache.hertzbeat.manager.dao.ParamDao params) {
        this(items, monitors, params, CONCURRENCY);
    }

    public WebsiteMonitorBatchService(
            WebsiteMonitorBatchItemDao items,
            MonitorService monitors,
            org.apache.hertzbeat.manager.dao.ParamDao params,
            int concurrency) {
        this(items, monitors, concurrency);
        this.params = Objects.requireNonNull(params);
    }

    public WebsiteMonitorBatchService(WebsiteMonitorBatchItemDao items, MonitorService monitors) {
        this(items, monitors, CONCURRENCY);
    }

    /**
     * Explicit small executor for deterministic isolated domain fixtures. Production uses ten
     * workers.
     */
    public WebsiteMonitorBatchService(
            WebsiteMonitorBatchItemDao items, MonitorService monitors, int concurrency) {
        this(items, monitors, concurrency, java.time.Duration.ofSeconds(55));
    }

    WebsiteMonitorBatchService(
            WebsiteMonitorBatchItemDao items,
            MonitorService monitors,
            int concurrency,
            java.time.Duration budget) {
        if (concurrency < 1
                || concurrency > CONCURRENCY
                || budget == null
                || budget.isZero()
                || budget.isNegative()
                || budget.toNanos() > MAX_EXECUTION_NANOS)
            throw new IllegalArgumentException("Bounded concurrency and execution budget required");
        this.executionNanos = budget.toNanos();
        this.items = items;
        this.monitors = monitors;
        this.executor =
                concurrency == 1
                        ? null
                        : new java.util.concurrent.ThreadPoolExecutor(
                                concurrency,
                                concurrency,
                                60,
                                java.util.concurrent.TimeUnit.SECONDS,
                                new java.util.concurrent.ArrayBlockingQueue<>(100),
                                Thread.ofPlatform()
                                        .daemon(true)
                                        .name("website-batch-", 0)
                                        .factory(),
                                new java.util.concurrent.ThreadPoolExecutor.AbortPolicy());
    }

    @jakarta.annotation.PreDestroy
    public void close() {
        closed.set(true);
        if (executor != null) executor.shutdown();
    }

    /** Pure candidate preparation; every live native probe requires the normal change approval. */
    public Map<String, Object> preflight(
            WebsiteMonitorBatch.Caller caller,
            WebsiteMonitorBatch.Request request,
            long budgetMillis,
            java.util.function.BooleanSupplier mayContinue) {
        scope(caller);
        Objects.requireNonNull(mayContinue, "A native execution gate is required");
        if (params == null || budgetMillis < 1 || budgetMillis > 20000)
            throw new IllegalArgumentException("CANDIDATE_PREFLIGHT_UNAVAILABLE");
        var prepared = prepare(request);
        var hosts = prepared.stream().map(item -> item.params().get("host")).toList();
        for (var item : prepared) {
            URI uri = URI.create(item.input().url());
            if (List.of(".local", ".localhost", ".internal", ".test", ".invalid", ".example")
                            .stream()
                            .anyMatch(uri.getHost().toLowerCase(Locale.ROOT)::endsWith)
                    || !"https".equals(uri.getScheme())
                    || uri.getPort() != -1 && uri.getPort() != 443
                    || !List.of("", "/").contains(uri.getRawPath())
                    || !uri.getHost()
                            .matches("(?i)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}"))
                throw new IllegalArgumentException("CANDIDATE_PUBLIC_WEBSITE_REQUIRED");
        }
        long deadline =
                System.nanoTime()
                        + java.util.concurrent.TimeUnit.MILLISECONDS.toNanos(budgetMillis);
        var existing = Set.copyOf(params.findExistingWebsiteHosts(hosts));
        List<Map<String, Object>> results = new ArrayList<>();
        for (String host : hosts) {
            boolean active = !closed.get() && System.nanoTime() < deadline && allowed(mayContinue);
            if (!active) results.add(candidate(host, "NOT_CHECKED", "CANDIDATE_BUDGET_EXHAUSTED"));
            else if (existing.contains(host))
                results.add(candidate(host, "EXISTING", "WEBSITE_ALREADY_MONITORED"));
            else results.add(candidate(host, "NOT_CHECKED", "APPROVAL_REQUIRED_NATIVE_PROBE"));
        }
        return Map.of(
                "planVersion",
                "website-preflight.v1",
                "items",
                List.copyOf(results),
                "checkedAt",
                java.time.Instant.now().toString(),
                "creationProof",
                false,
                "networkProbePerformed",
                false,
                "networkProbeRequiresApproval",
                true);
    }

    private Map<String, Object> candidate(String host, String state, String reason) {
        return Map.of(
                "domain",
                host,
                "state",
                state,
                "reason",
                reason,
                "checkedAt",
                java.time.Instant.now().toString());
    }

    public WebsiteMonitorBatch.Result create(
            WebsiteMonitorBatch.Caller caller, WebsiteMonitorBatch.Request request) {
        return create(caller, request, () -> !Thread.currentThread().isInterrupted());
    }

    public WebsiteMonitorBatch.Result create(
            WebsiteMonitorBatch.Caller caller,
            WebsiteMonitorBatch.Request request,
            java.util.function.BooleanSupplier mayContinue) {
        return createInternal(caller, request, mayContinue, false);
    }

    /** AI-selected batches require new hosts; ordinary native API semantics remain unchanged. */
    public WebsiteMonitorBatch.Result createUniqueHosts(
            WebsiteMonitorBatch.Caller caller,
            WebsiteMonitorBatch.Request request,
            java.util.function.BooleanSupplier mayContinue) {
        return createInternal(caller, request, mayContinue, true);
    }

    private WebsiteMonitorBatch.Result createInternal(
            WebsiteMonitorBatch.Caller caller,
            WebsiteMonitorBatch.Request request,
            java.util.function.BooleanSupplier mayContinue,
            boolean uniqueHosts) {
        Objects.requireNonNull(mayContinue, "A native execution gate is required");
        long started = System.nanoTime();
        long deadline = started + executionNanos;
        String scope = scope(caller);
        List<Prepared> prepared = prepare(request);
        Set<String> existingHosts =
                !uniqueHosts || params == null
                        ? Set.of()
                        : Set.copyOf(
                                params.findExistingWebsiteHosts(
                                        prepared.stream()
                                                .map(item -> item.params().get("host"))
                                                .toList()));
        for (Prepared item : prepared) {
            items.findById(key(scope, item.input().idempotencyKey()))
                    .ifPresent(row -> requireSame(row, item));
        }
        var stopped = new java.util.concurrent.atomic.AtomicBoolean();
        java.util.function.BooleanSupplier gate =
                () ->
                        !closed.get()
                                && !stopped.get()
                                && System.nanoTime() < deadline
                                && mayContinue.getAsBoolean();
        var context = NativeContext.capture();
        List<java.util.concurrent.Future<WebsiteMonitorBatch.Receipt>> futures = new ArrayList<>();
        for (Prepared item : prepared) {
            if (executor == null) {
                futures.add(
                        java.util.concurrent.CompletableFuture.completedFuture(
                                one(
                                        scope,
                                        item,
                                        request.retryPreflightFailures(),
                                        gate,
                                        existingHosts)));
            } else {
                try {
                    futures.add(
                            executor.submit(
                                    () ->
                                            context.call(
                                                    () ->
                                                            one(
                                                                    scope,
                                                                    item,
                                                                    request
                                                                            .retryPreflightFailures(),
                                                                    gate,
                                                                    existingHosts))));
                } catch (java.util.concurrent.RejectedExecutionException busy) {
                    futures.add(
                            java.util.concurrent.CompletableFuture.completedFuture(
                                    receipt(
                                            item,
                                            "NOT_STARTED",
                                            null,
                                            "BATCH_CAPACITY_BUSY",
                                            Map.of(),
                                            Map.of())));
                }
            }
        }
        List<WebsiteMonitorBatch.Receipt> result = new ArrayList<>();
        for (int i = 0; i < futures.size(); i++) {
            try {
                result.add(
                        futures.get(i)
                                .get(
                                        Math.max(1, deadline - System.nanoTime()),
                                        java.util.concurrent.TimeUnit.NANOSECONDS));
            } catch (InterruptedException cancelled) {
                stopped.set(true);
                futures.forEach(future -> future.cancel(true));
                Thread.currentThread().interrupt();
                result.add(
                        receipt(
                                prepared.get(i),
                                "UNKNOWN",
                                null,
                                "INTERRUPTED_RECONCILE",
                                Map.of(),
                                Map.of()));
            } catch (java.util.concurrent.TimeoutException expired) {
                stopped.set(true);
                futures.forEach(future -> future.cancel(true));
                result.add(
                        receipt(
                                prepared.get(i),
                                "UNKNOWN",
                                null,
                                "BATCH_TIME_BUDGET_RECONCILE",
                                Map.of(),
                                Map.of()));
            } catch (java.util.concurrent.ExecutionException
                    | java.util.concurrent.CancellationException uncertain) {
                result.add(
                        receipt(
                                prepared.get(i),
                                "UNKNOWN",
                                null,
                                "NATIVE_BATCH_ITEM_OUTCOME_UNKNOWN",
                                Map.of(),
                                Map.of()));
            }
        }
        var completed = result(result);
        org.slf4j.LoggerFactory.getLogger(WebsiteMonitorBatchService.class)
                .info(
                        "Native website batch items={} verified={} failed={} pending={} unknown={}"
                                + " elapsedMs={}",
                        prepared.size(),
                        completed.verified(),
                        completed.failed(),
                        completed.pending(),
                        completed.unknown(),
                        java.util.concurrent.TimeUnit.NANOSECONDS.toMillis(
                                System.nanoTime() - started));
        return completed;
    }

    private WebsiteMonitorBatch.Receipt one(
            String scope,
            Prepared item,
            boolean retry,
            java.util.function.BooleanSupplier gate,
            Set<String> existingHosts) {
        if (!allowed(gate))
            return receipt(
                    item, "NOT_STARTED", null, "EXECUTION_NO_LONGER_ACTIVE", Map.of(), Map.of());
        try {
            return execute(scope, item, retry, gate, existingHosts);
        } catch (IllegalArgumentException conflict) {
            return receipt(
                    item, "CONFLICT", null, "IDEMPOTENCY_ARGUMENT_CONFLICT", Map.of(), Map.of());
        }
    }

    /**
     * Durable progress of prior completed readback; no probes, writes, new claims or live state
     * assertions.
     */
    public WebsiteMonitorBatch.Result progress(
            WebsiteMonitorBatch.Caller caller, WebsiteMonitorBatch.Request request) {
        String scope = scope(caller);
        var prepared = prepare(request);
        var existing = new java.util.HashMap<String, WebsiteMonitorBatchItem>();
        items.findAllById(
                        prepared.stream()
                                .map(item -> key(scope, item.input().idempotencyKey()))
                                .toList())
                .forEach(row -> existing.put(row.getId(), row));
        List<WebsiteMonitorBatch.Receipt> progress = new ArrayList<>();
        for (Prepared item : prepared) {
            var row = existing.get(key(scope, item.input().idempotencyKey()));
            if (row == null)
                progress.add(receipt(item, "NOT_STARTED", null, "NO_CLAIM", Map.of(), Map.of()));
            else {
                requireSame(row, item);
                if ("VERIFIED".equals(row.getState()) && row.getMonitorId() != null) {
                    progress.add(
                            receipt(
                                    item,
                                    "VERIFIED",
                                    row.getMonitorId(),
                                    "DURABLE_NATIVE_READBACK",
                                    Map.of(
                                            "name",
                                            item.input().name().trim(),
                                            "app",
                                            "website",
                                            "intervals",
                                            item.input().intervals()),
                                    item.params()));
                } else {
                    String state =
                            !interruptedProbe(row)
                                            && java.util.Set.of("INVALID", "PROBE_FAILED")
                                                    .contains(row.getState())
                                    ? row.getState()
                                    : java.util.Set.of("CLAIMED", "WRITING", "CREATED")
                                                    .contains(row.getState())
                                            ? "IN_PROGRESS"
                                            : "UNKNOWN";
                    progress.add(
                            receipt(
                                    item,
                                    state,
                                    row.getMonitorId(),
                                    row.getReason(),
                                    Map.of(),
                                    Map.of()));
                }
            }
        }
        return result(progress);
    }

    public WebsiteMonitorBatch.Result status(
            WebsiteMonitorBatch.Caller caller, WebsiteMonitorBatch.Request request) {
        String scope = scope(caller);
        List<WebsiteMonitorBatch.Receipt> result = new ArrayList<>();
        for (Prepared item : prepare(request)) {
            var row = items.findById(key(scope, item.input().idempotencyKey())).orElse(null);
            if (row == null) {
                result.add(receipt(item, "NOT_STARTED", null, "NO_CLAIM", Map.of(), Map.of()));
            } else {
                requireSame(row, item);
                result.add(readback(item, row));
            }
        }
        return result(result);
    }

    private WebsiteMonitorBatch.Receipt execute(
            String scope,
            Prepared item,
            boolean retry,
            java.util.function.BooleanSupplier mayContinue,
            Set<String> existingHosts) {
        String key = key(scope, item.input().idempotencyKey());
        WebsiteMonitorBatchItem row = items.findById(key).orElse(null);
        boolean owner = false;
        if (row == null) {
            row = new WebsiteMonitorBatchItem();
            row.setId(key);
            row.setInputHash(item.hash());
            row.setState("CLAIMED");
            try {
                row = items.saveAndFlush(row);
                owner = true;
            } catch (DataIntegrityViolationException raced) {
                row = items.findById(key).orElseThrow();
            }
        }
        requireSame(row, item);
        if (!owner && retry && "PROBE_FAILED".equals(row.getState()) && !interruptedProbe(row)) {
            owner = items.retryProbe(key, item.hash(), row.getVersion()) == 1;
            row = items.findById(key).orElseThrow();
        }
        if (!owner) {
            var existing = readback(item, row);
            return "VERIFIED".equals(existing.state())
                    ? new WebsiteMonitorBatch.Receipt(
                            existing.idempotencyKey(),
                            existing.state(),
                            existing.monitorId(),
                            "NATIVE_IDEMPOTENT_REPLAY",
                            existing.fields(),
                            existing.parameters())
                    : existing;
        }
        if (existingHosts.contains(item.params().get("host")))
            return failed(item, row, "CONFLICT", "WEBSITE_ALREADY_MONITORED");
        if (!allowed(mayContinue)) {
            return failed(item, row, "UNKNOWN", "EXECUTION_STOPPED_RECONCILE");
        }
        MonitorDto draft = dto(item);
        try {
            monitors.validate(draft, false);
        } catch (RuntimeException invalid) {
            return failed(item, row, "INVALID", "NATIVE_VALIDATION_FAILED");
        }
        Monitor monitor = draft.getMonitor();
        List<Param> params = draft.getParams();
        // Match the native create API: configuration validation precedes persistence, while
        // availability belongs to normal collector execution. VERIFIED below proves persisted
        // configuration only; it must never imply an HTTP200 response or healthy target.
        if (!allowed(mayContinue)) {
            return failed(item, row, "UNKNOWN", "EXECUTION_STOPPED_RECONCILE");
        }
        row = save(row, "WRITING", null);
        if (!allowed(mayContinue)) {
            return failed(item, row, "UNKNOWN", "EXECUTION_STOPPED_RECONCILE");
        }
        try {
            monitors.addMonitor(monitor, params, null, null);
            row.setMonitorId(monitor.getId());
            row = save(row, "CREATED", null);
        } catch (RuntimeException uncertain) {
            row.setMonitorId(monitor.getId());
            row = save(row, "UNKNOWN", nativeWriteFailureReason(uncertain));
        }
        var verified = readback(item, row);
        if ("VERIFIED".equals(verified.state())) save(row, "VERIFIED", verified.reason());
        return verified;
    }

    private static String nativeWriteFailureReason(RuntimeException failure) {
        // Preserve uncertainty: a database constraint is not independent rollback/readback proof.
        // Inspect only typed SQLSTATE, never SQL text, target values or exception messages.
        Throwable cause = failure;
        for (int depth = 0; cause != null && depth < 8; depth++, cause = cause.getCause()) {
            if (cause instanceof java.sql.SQLException sql
                    && sql.getSQLState() != null
                    && sql.getSQLState().startsWith("23")) {
                return "NATIVE_WRITE_CONSTRAINT_OUTCOME_UNKNOWN";
            }
        }
        return "NATIVE_WRITE_OUTCOME_UNKNOWN";
    }

    private static String unavailableReadbackReason(WebsiteMonitorBatchItem row) {
        return "UNKNOWN".equals(row.getState())
                        && "NATIVE_WRITE_CONSTRAINT_OUTCOME_UNKNOWN".equals(row.getReason())
                ? "NATIVE_WRITE_CONSTRAINT_READBACK_UNAVAILABLE"
                : "READBACK_UNAVAILABLE";
    }

    private WebsiteMonitorBatch.Receipt failed(
            Prepared item, WebsiteMonitorBatchItem row, String state, String reason) {
        return readback(item, save(row, state, reason));
    }

    private WebsiteMonitorBatchItem save(WebsiteMonitorBatchItem row, String state, String reason) {
        row.setState(state);
        row.setReason(reason);
        return items.saveAndFlush(row);
    }

    private WebsiteMonitorBatch.Receipt readback(Prepared item, WebsiteMonitorBatchItem row) {
        if (row.getMonitorId() == null) {
            return receipt(
                    item,
                    interruptedProbe(row)
                            ? "UNKNOWN"
                            : "CLAIMED".equals(row.getState()) || "WRITING".equals(row.getState())
                                    ? "IN_PROGRESS"
                                    : row.getState(),
                    null,
                    row.getReason(),
                    Map.of(),
                    Map.of());
        }
        MonitorDto stored;
        try {
            stored = monitors.getMonitorDto(row.getMonitorId());
        } catch (RuntimeException unavailable) {
            return receipt(
                    item,
                    "UNKNOWN",
                    row.getMonitorId(),
                    unavailableReadbackReason(row),
                    Map.of(),
                    Map.of());
        }
        if (stored == null || stored.getMonitor() == null || stored.getParams() == null) {
            return receipt(
                    item,
                    "UNKNOWN",
                    row.getMonitorId(),
                    unavailableReadbackReason(row),
                    Map.of(),
                    Map.of());
        }
        Monitor monitor = stored.getMonitor();
        Map<String, String> params = new LinkedHashMap<>();
        stored.getParams().stream()
                .filter(p -> item.params().containsKey(p.getField()))
                .forEach(p -> params.put(p.getField(), p.getParamValue()));
        if (!Objects.equals(monitor.getId(), row.getMonitorId())
                || !item.input().name().trim().equals(monitor.getName())
                || !"website".equals(monitor.getApp())
                || !item.input().intervals().equals(monitor.getIntervals())
                || !params.equals(item.params())) {
            return receipt(
                    item, "UNKNOWN", row.getMonitorId(), "READBACK_MISMATCH", Map.of(), Map.of());
        }
        return receipt(
                item,
                "VERIFIED",
                row.getMonitorId(),
                "UNKNOWN".equals(row.getState())
                        ? "NATIVE_STATE_RECONCILED"
                        : "NATIVE_CREATE_READBACK",
                Map.of(
                        "name",
                        monitor.getName(),
                        "app",
                        monitor.getApp(),
                        "intervals",
                        monitor.getIntervals()),
                Map.copyOf(params));
    }

    private boolean interruptedProbe(WebsiteMonitorBatchItem row) {
        return "PROBE_FAILED".equals(row.getState())
                && "EXECUTION_NO_LONGER_ACTIVE".equals(row.getReason());
    }

    private WebsiteMonitorBatch.Receipt receipt(
            Prepared item,
            String state,
            Long id,
            String reason,
            Map<String, Object> fields,
            Map<String, String> params) {
        return new WebsiteMonitorBatch.Receipt(
                item.input().idempotencyKey(),
                state,
                id == null ? null : id.toString(),
                reason,
                fields,
                params);
    }

    private WebsiteMonitorBatch.Result result(List<WebsiteMonitorBatch.Receipt> receipts) {
        int verified = 0;
        int failed = 0;
        int pending = 0;
        int unknown = 0;
        for (var receipt : receipts) {
            switch (receipt.state()) {
                case "VERIFIED" -> verified++;
                case "INVALID", "PROBE_FAILED", "CONFLICT" -> failed++;
                case "NOT_STARTED", "IN_PROGRESS" -> pending++;
                default -> unknown++;
            }
        }
        return new WebsiteMonitorBatch.Result(
                1, List.copyOf(receipts), verified, failed, pending, unknown);
    }

    private boolean allowed(java.util.function.BooleanSupplier gate) {
        try {
            return !Thread.currentThread().isInterrupted() && gate.getAsBoolean();
        } catch (RuntimeException unavailable) {
            return false;
        }
    }

    private String scope(WebsiteMonitorBatch.Caller caller) {
        if (caller == null
                || caller.actor() == null
                || caller.actor().isBlank()
                || caller.actor().length() > 255
                || caller.workspace() == null
                || caller.workspace().isBlank()
                || caller.workspace().length() > 255
                || !(caller.roles().contains("admin") || caller.roles().contains("user"))) {
            throw new SecurityException(
                    "Authenticated monitor-create permission and workspace are required");
        }
        return hash(JsonUtil.toJson(List.of(caller.workspace(), caller.actor())));
    }

    private String key(String scope, String key) {
        return hash(scope + ":" + key);
    }

    private void requireSame(WebsiteMonitorBatchItem row, Prepared item) {
        if (!row.getInputHash().equals(item.hash())) {
            throw new IllegalArgumentException(
                    "Idempotency key is already bound to different monitor arguments");
        }
    }

    private List<Prepared> prepare(WebsiteMonitorBatch.Request request) {
        if (request == null
                || request.items() == null
                || request.items().isEmpty()
                || request.items().size() > WebsiteMonitorBatch.MAX_ITEMS) {
            throw new IllegalArgumentException("Website batches require 1 to 50 items");
        }
        List<Prepared> result = new ArrayList<>();
        var keys = new HashSet<String>();
        var names = new HashSet<String>();
        var targets = new HashSet<Map<String, String>>();
        for (var item : request.items()) {
            var prepared = prepare(item);
            if (!keys.add(item.idempotencyKey())
                    || !names.add(item.name().trim())
                    || !targets.add(
                            Map.of(
                                    "host",
                                    prepared.params().get("host"),
                                    "port",
                                    prepared.params().get("port"),
                                    "ssl",
                                    prepared.params().get("ssl"),
                                    "uri",
                                    prepared.params().get("uri")))) {
                throw new IllegalArgumentException(
                        "Batch item keys, monitor names and effective targets must be unique");
            }
            result.add(prepared);
        }
        return result;
    }

    private Prepared prepare(WebsiteMonitorBatch.Item item) {
        if (item == null
                || item.idempotencyKey() == null
                || !item.idempotencyKey().matches("[A-Za-z0-9_.:-]{1,128}")
                || item.name() == null
                || item.name().isBlank()
                || item.name().length() > 100
                || item.url() == null
                || item.url().length() > 2048
                || item.intervals() == null
                || item.intervals() < 1
                || item.timeout() != null && (item.timeout() < 1 || item.timeout() > 10000)) {
            throw new IllegalArgumentException("Complete bounded website item fields are required");
        }
        URI uri;
        try {
            uri = URI.create(item.url()).normalize();
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("A valid credential-free website URL is required");
        }
        boolean ssl = "https".equalsIgnoreCase(uri.getScheme());
        if (!(ssl || "http".equalsIgnoreCase(uri.getScheme()))
                || uri.getHost() == null
                || uri.getUserInfo() != null
                || uri.getRawQuery() != null
                || uri.getFragment() != null
                || uri.getPort() == 0
                || uri.getPort() > 65535) {
            throw new IllegalArgumentException(
                    "Credential-free HTTP URLs without queries or fragments are required");
        }
        Map<String, String> params = new LinkedHashMap<>();
        params.put("host", uri.getHost().toLowerCase(Locale.ROOT));
        params.put("port", Integer.toString(uri.getPort() < 0 ? ssl ? 443 : 80 : uri.getPort()));
        params.put("ssl", Boolean.toString(ssl));
        params.put(
                "uri",
                uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath());
        if (item.timeout() != null) {
            params.put("timeout", item.timeout().toString());
        }
        String canonical =
                JsonUtil.toJson(List.of(item.name().trim(), "website", item.intervals(), params));
        return new Prepared(item, Map.copyOf(params), hash(canonical));
    }

    private MonitorDto dto(Prepared item) {
        MonitorDto dto = new MonitorDto();
        dto.setMonitor(
                Monitor.builder()
                        .name(item.input().name().trim())
                        .app("website")
                        .intervals(item.input().intervals())
                        .instance(item.params().get("host"))
                        .type((byte) 0)
                        .labels(Map.of())
                        .annotations(Map.of())
                        .build());
        dto.setParams(
                item.params().entrySet().stream()
                        .map(
                                e ->
                                        Param.builder()
                                                .field(e.getKey())
                                                .paramValue(e.getValue())
                                                .type(
                                                        "port".equals(e.getKey())
                                                                        || "timeout"
                                                                                .equals(e.getKey())
                                                                ? (byte) 0
                                                                : (byte) 1)
                                                .build())
                        .toList(),
                false);
        return dto;
    }

    private String hash(String value) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable");
        }
    }

    private record NativeContext(
            String workspace,
            String authenticatedWorkspace,
            String collector,
            com.usthe.sureness.subject.SubjectSum subject) {
        static NativeContext capture() {
            return new NativeContext(
                    org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext
                            .currentWorkspaceId(),
                    org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext
                            .currentAuthenticatedWorkspaceId(),
                    org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext
                            .currentCollectorId(),
                    com.usthe.sureness.util.SurenessContextHolder.getBindSubject());
        }

        <T> T call(java.util.function.Supplier<T> action) {
            NativeContext previous = capture();
            try {
                bind();
                return action.get();
            } finally {
                previous.bind();
            }
        }

        private void bind() {
            org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext.clear();
            org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext
                    .bindWorkspaceId(workspace);
            org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext
                    .bindAuthenticatedWorkspaceId(authenticatedWorkspace);
            org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext
                    .bindCollectorId(collector);
            com.usthe.sureness.util.SurenessContextHolder.clear();
            if (subject != null) com.usthe.sureness.util.SurenessContextHolder.bindSubject(subject);
        }
    }

    private record Prepared(
            WebsiteMonitorBatch.Item input, Map<String, String> params, String hash) {}
}
