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

package org.apache.hertzbeat.collector.runtime.otel;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.SmartLifecycle;

/**
 * Supervises the optional OpenTelemetry data-plane process while keeping Java collection independent.
 */
@Slf4j
public class OtelRuntimeSupervisor implements SmartLifecycle, AutoCloseable {

    private static final long HEALTH_POLL_MILLIS = 100;

    private final OtelRuntimeProperties properties;
    private final OtelRuntimeBinaryResolver resolver;
    private final OtelRuntimeConfigTransaction configTransaction;
    private final OtelRuntimeProcessLauncher launcher;
    private final OtelRuntimeHealthClient healthClient;
    private final ScheduledExecutorService executor;
    private final ArrayDeque<Long> recentFailures = new ArrayDeque<>();

    private volatile OtelRuntimeSnapshot snapshot = new OtelRuntimeSnapshot(
            OtelRuntimeState.STOPPED, -1, 0, Instant.now(), "");
    private Process process;
    private long generation;
    private boolean intentionalStop = true;

    public OtelRuntimeSupervisor(OtelRuntimeProperties properties, OtelRuntimeBinaryResolver resolver,
                                 OtelRuntimeConfigTransaction configTransaction, OtelRuntimeProcessLauncher launcher,
                                 OtelRuntimeHealthClient healthClient) {
        this.properties = properties;
        this.resolver = resolver;
        this.configTransaction = configTransaction;
        this.launcher = launcher;
        this.healthClient = healthClient;
        this.executor = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "hertzbeat-otel-runtime-supervisor");
            thread.setDaemon(true);
            return thread;
        });
    }

    @Override
    public synchronized void start() {
        if (!properties.isEnabled() || snapshot.state() == OtelRuntimeState.RUNNING
                || snapshot.state() == OtelRuntimeState.STARTING) {
            return;
        }
        intentionalStop = false;
        startAttempt();
    }

    private void startAttempt() {
        update(OtelRuntimeState.STARTING, -1, snapshot.restartCount(), snapshot.lastError());
        OtelRuntimeConfigTransaction.PreparedConfig prepared = null;
        try {
            Path binary = resolver.resolve();
            prepared = configTransaction.prepare(properties);
            Path home = properties.getHome().toAbsolutePath().normalize();
            Path logFile = OtelRuntimeConfigRenderer.resolve(home, properties.getLog());
            Map<String, String> environment = environment();
            validate(binary, prepared.candidate(), home, logFile, environment);
            Path config = configTransaction.commit(prepared);
            try {
                Process launched = launchAndAwait(binary, config, home, logFile, environment);
                markRunning(launched, snapshot.restartCount(), snapshot.lastError());
            } catch (IOException | InterruptedException | RuntimeException candidateError) {
                terminateFailedStartup();
                if (!recoverLastKnownGood(prepared, binary, home, logFile, environment, candidateError)) {
                    throw candidateError;
                }
            }
        } catch (Exception error) {
            discardCandidate(prepared);
            terminateFailedStartup();
            recordFailure(safeMessage(error));
        }
    }

    private Process launchAndAwait(Path binary, Path config, Path home, Path logFile,
                                   Map<String, String> environment) throws IOException, InterruptedException {
        Process launched = launcher.start(binary, config, home, logFile, environment, false);
        process = launched;
        long launchedGeneration = ++generation;
        launched.onExit().thenRun(() -> handleExit(launched, launchedGeneration));
        awaitHealthy(launched);
        if (!launched.isAlive()) {
            throw new IllegalStateException("HertzBeat telemetry runtime exited during startup");
        }
        return launched;
    }

    private boolean recoverLastKnownGood(OtelRuntimeConfigTransaction.PreparedConfig prepared, Path binary,
                                         Path home, Path logFile, Map<String, String> environment,
                                         Exception candidateError) throws IOException, InterruptedException {
        if (!configTransaction.rollback(prepared)) {
            return false;
        }
        String candidateMessage = safeMessage(candidateError);
        log.warn("HertzBeat telemetry runtime candidate failed readiness; restoring last-known-good: {}",
                candidateMessage);
        validate(binary, prepared.active(), home, logFile, environment);
        Process recovered = launchAndAwait(binary, prepared.active(), home, logFile, environment);
        markRunning(recovered, snapshot.restartCount() + 1, candidateMessage);
        return true;
    }

    private void markRunning(Process launched, int restartCount, String lastError) {
        update(OtelRuntimeState.RUNNING, launched.pid(), restartCount, lastError);
        log.info("HertzBeat telemetry runtime is ready, pid={}", launched.pid());
    }

    private void discardCandidate(OtelRuntimeConfigTransaction.PreparedConfig prepared) {
        if (prepared == null) {
            return;
        }
        try {
            configTransaction.discard(prepared);
        } catch (IOException error) {
            log.warn("Failed to remove rejected HertzBeat telemetry runtime configuration: {}", safeMessage(error));
        }
    }

    private void terminateFailedStartup() {
        Process failed = process;
        process = null;
        if (failed == null || !failed.isAlive()) {
            return;
        }
        failed.destroy();
        try {
            if (!failed.waitFor(properties.getShutdownTimeout().toMillis(), TimeUnit.MILLISECONDS)) {
                failed.destroyForcibly();
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            failed.destroyForcibly();
        }
    }

    private void validate(Path binary, Path config, Path home, Path logFile,
                          Map<String, String> environment) throws IOException, InterruptedException {
        Process validation = launcher.start(binary, config, home, logFile, environment, true);
        boolean completed = validation.waitFor(properties.getValidateTimeout().toMillis(), TimeUnit.MILLISECONDS);
        if (!completed) {
            validation.destroyForcibly();
            throw new IllegalStateException("HertzBeat telemetry runtime validation timed out; inspect " + logFile);
        }
        if (validation.exitValue() != 0) {
            throw new IllegalStateException("HertzBeat telemetry runtime validation failed; inspect " + logFile);
        }
    }

    private void awaitHealthy(Process launched) throws InterruptedException {
        URI healthEndpoint = URI.create("http://127.0.0.1:" + properties.getHealthPort() + "/");
        long deadline = System.nanoTime() + properties.getStartupTimeout().toNanos();
        while (launched.isAlive() && System.nanoTime() < deadline) {
            if (healthClient.isHealthy(healthEndpoint, properties.getHealthTimeout())) {
                return;
            }
            Thread.sleep(HEALTH_POLL_MILLIS);
        }
        throw new IllegalStateException("HertzBeat telemetry runtime did not become ready at " + healthEndpoint);
    }

    private Map<String, String> environment() {
        Map<String, String> environment = new HashMap<>();
        environment.put("HERTZBEAT_COLLECTOR_ID", properties.getCollectorId());
        environment.put("HERTZBEAT_WORKSPACE_ID", properties.getWorkspaceId());
        environment.put("HERTZBEAT_OTLP_HTTP_ENDPOINT", properties.getExportEndpoint().toString());
        environment.put("HERTZBEAT_OTLP_TOKEN", properties.getToken());
        environment.put("HERTZBEAT_OTEL_HEALTH_PORT", Integer.toString(properties.getHealthPort()));
        return environment;
    }

    private synchronized void handleExit(Process exited, long exitedGeneration) {
        if (intentionalStop || exitedGeneration != generation || process != exited) {
            return;
        }
        process = null;
        int exitCode = exited.exitValue();
        recordFailure("HertzBeat telemetry runtime exited unexpectedly with code " + exitCode);
    }

    private synchronized void recordFailure(String message) {
        int restartCount = snapshot.restartCount() + 1;
        long now = System.currentTimeMillis();
        recentFailures.addLast(now);
        long cutoff = now - properties.getRestartWindow().toMillis();
        while (!recentFailures.isEmpty() && recentFailures.getFirst() < cutoff) {
            recentFailures.removeFirst();
        }
        if (recentFailures.size() >= properties.getMaxRestarts()) {
            update(OtelRuntimeState.FAILED, -1, restartCount, message);
            log.error("HertzBeat telemetry runtime recovery circuit opened: {}", message);
            return;
        }
        update(OtelRuntimeState.DEGRADED, -1, restartCount, message);
        log.warn("HertzBeat telemetry runtime is degraded; Java collection remains available: {}", message);
        if (!intentionalStop) {
            executor.schedule(this::retry, properties.getRestartDelay().toMillis(), TimeUnit.MILLISECONDS);
        }
    }

    private synchronized void retry() {
        if (!intentionalStop && snapshot.state() == OtelRuntimeState.DEGRADED) {
            startAttempt();
        }
    }

    private static String safeMessage(Exception error) {
        String message = error.getMessage();
        return message == null || message.isBlank() ? error.getClass().getSimpleName() : message;
    }

    @Override
    public synchronized void stop() {
        intentionalStop = true;
        Process current = process;
        if (current == null) {
            update(OtelRuntimeState.STOPPED, -1, snapshot.restartCount(), snapshot.lastError());
            return;
        }
        update(OtelRuntimeState.STOPPING, current.pid(), snapshot.restartCount(), snapshot.lastError());
        current.destroy();
        try {
            if (!current.waitFor(properties.getShutdownTimeout().toMillis(), TimeUnit.MILLISECONDS)) {
                current.destroyForcibly();
                current.waitFor(properties.getShutdownTimeout().toMillis(), TimeUnit.MILLISECONDS);
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            current.destroyForcibly();
        } finally {
            process = null;
            update(OtelRuntimeState.STOPPED, -1, snapshot.restartCount(), snapshot.lastError());
        }
    }

    @Override
    public boolean isRunning() {
        return snapshot.state() == OtelRuntimeState.RUNNING;
    }

    @Override
    public boolean isAutoStartup() {
        return true;
    }

    @Override
    public int getPhase() {
        return Integer.MAX_VALUE;
    }

    public OtelRuntimeSnapshot snapshot() {
        return snapshot;
    }

    private void update(OtelRuntimeState state, long pid, int restartCount, String lastError) {
        snapshot = new OtelRuntimeSnapshot(state, pid, restartCount, Instant.now(), lastError);
    }

    @Override
    public void close() {
        stop();
        executor.shutdownNow();
    }
}
