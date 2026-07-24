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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.BackendFault;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.LoadObservation;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.LoadProfile;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Opt-in real Runtime soak gate. The class name keeps it out of ordinary Surefire discovery. */
class OtelRuntimeSoakIt {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final Duration DEFAULT_DURATION = Duration.ofHours(24);
    private static final Duration DEFAULT_SAMPLE_INTERVAL = Duration.ofMinutes(30);
    private static final long MINIMUM_USABLE_SPACE_BYTES = 1024L * 1024 * 1024;
    private static final long MAXIMUM_RUNTIME_DATA_BYTES = 256L * 1024 * 1024;
    private static final int MAXIMUM_SAMPLES = 64;

    @TempDir
    private Path tempDir;

    @Test
    void sustainsBoundedThreeSignalFaultRecovery() throws Exception {
        String runtimeBinary = runtimeBinary();
        Duration duration = durationProperty("hertzbeat.otel.soak.duration", DEFAULT_DURATION);
        Duration interval = durationProperty("hertzbeat.otel.soak.interval", DEFAULT_SAMPLE_INTERVAL);
        validateSchedule(duration, interval);
        List<Map<String, Object>> observations = new ArrayList<>();
        OtelRuntimeFaultBackend backend = new OtelRuntimeFaultBackend();
        GuardedResources resources = new GuardedResources(backend);
        Thread shutdownHook = new Thread(resources::close, "otel-soak-shutdown");
        Runtime.getRuntime().addShutdownHook(shutdownHook);
        String unavailableReason = null;
        Throwable testFailure = null;
        long runtimePid = -1;
        try {
            requireCapacity(tempDir);
            backend.start();
            OtelRuntimeProperties properties = OtelRuntimeFaultLoadSupport.properties(
                    tempDir, runtimeBinary, backend.port());
            OtelRuntimeSupervisor supervisor = OtelRuntimeSoakSupport.supervisorWithDiscardedLogs(properties);
            resources.supervisor(supervisor);
            OtelRuntimeStatusProvider statusProvider = OtelRuntimeFaultLoadSupport.statusProvider(
                    properties, supervisor);
            supervisor.start();
            runtimePid = supervisor.snapshot().pid();
            observations.add(sample(0, "started", statusProvider.status(), backend, properties, null));
            OtelRuntimeFaultLoadSupport.writeM7ThreeReport("soak.json", observations);

            long deadline = System.nanoTime() + duration.toNanos();
            long nextSample = System.nanoTime();
            int cycle = 0;
            while (System.nanoTime() < deadline) {
                cycle++;
                requireCapacity(tempDir);
                requireRuntimeDataBound(properties);
                CycleObservation cycleObservation = recoverOneCycle(
                        cycle, backend, properties, statusProvider);
                ManagedOtelRuntimeStatus status = statusProvider.status();
                assertEquals(runtimePid, status.pid());
                assertEquals(0, status.restartCount());
                assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, status.failureCode());
                observations.add(sample(cycle, "sampled", status, backend, properties, cycleObservation));
                OtelRuntimeFaultLoadSupport.writeM7ThreeReport("soak.json", observations);
                nextSample += interval.toNanos();
                sleepUntil(Math.min(nextSample, deadline));
            }
            observations.add(sample(observations.size(), "completed", statusProvider.status(),
                    backend, properties, null));
            OtelRuntimeFaultLoadSupport.writeM7ThreeReport("soak.json", observations);
        } catch (SoakUnavailableException unavailable) {
            unavailableReason = unavailable.reasonCode();
            observations.add(event("unavailable", unavailableReason));
            OtelRuntimeFaultLoadSupport.writeM7ThreeReport("soak.json", observations);
        } catch (Throwable failure) {
            testFailure = failure;
            observations.add(event("error", failure.getClass().getSimpleName()));
            OtelRuntimeFaultLoadSupport.writeM7ThreeReport("soak.json", observations);
        } finally {
            resources.close();
            try {
                Runtime.getRuntime().removeShutdownHook(shutdownHook);
            } catch (IllegalStateException ignored) {
                // JVM shutdown is already running the same idempotent cleanup.
            }
        }
        if (runtimePid > 0) {
            OtelRuntimeFaultLoadSupport.awaitProcessStopped(runtimePid, Duration.ofSeconds(5));
        }
        assertTrue(backend.isStopped());
        assertTrue(backend.largestWorkerCount() <= OtelRuntimeFaultBackend.WORKER_LIMIT);
        assertTrue(backend.maximumTaskQueueDepth() <= OtelRuntimeFaultBackend.TASK_QUEUE_LIMIT);
        if (unavailableReason != null) {
            String reason = unavailableReason;
            Assumptions.assumeTrue(false, () -> "soak unavailable: " + reason);
        }
        if (testFailure != null) {
            throw new AssertionError("soak gate failed", testFailure);
        }
    }

    private CycleObservation recoverOneCycle(
            int cycle,
            OtelRuntimeFaultBackend backend,
            OtelRuntimeProperties properties,
            OtelRuntimeStatusProvider statusProvider) throws Exception {
        String marker = "soak-cycle-" + cycle + '-' + System.nanoTime();
        backend.fault(BackendFault.HTTP_503);
        try {
            int attempts = backend.attemptCount();
            LoadObservation load = OtelRuntimeFaultLoadSupport.sendPersistenceProbe(
                    properties.getOtlpHttpEndpoint(), marker);
            backend.awaitAttemptAfter(attempts, Duration.ofSeconds(20));
            OtelRuntimeFaultLoadSupport.awaitQueued(
                    statusProvider, LoadProfile.MIXED, Duration.ofSeconds(20));
            long recoveryStarted = System.nanoTime();
            backend.recover();
            backend.awaitSuccessful(LoadProfile.MIXED, marker, Duration.ofSeconds(40));
            OtelRuntimeFaultLoadSupport.awaitDrained(
                    statusProvider, LoadProfile.MIXED, Duration.ofSeconds(40));
            OtelRuntimeSoakSupport.awaitBackendIdle(backend, Duration.ofSeconds(5));
            long recoveryMillis = Duration.ofNanos(System.nanoTime() - recoveryStarted).toMillis();
            return new CycleObservation(load, recoveryMillis);
        } finally {
            backend.recover();
        }
    }

    private Map<String, Object> sample(
            int cycle,
            String event,
            ManagedOtelRuntimeStatus status,
            OtelRuntimeFaultBackend backend,
            OtelRuntimeProperties properties,
            CycleObservation cycleObservation) throws Exception {
        Map<String, Object> sample = cycleObservation == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(OtelRuntimeFaultLoadSupport.observation(
                        BackendFault.HTTP_503, cycleObservation.load(), cycleObservation.recoveryMillis(),
                        status.pid(), properties));
        sample.put("cycle", cycle);
        sample.put("event", event);
        sample.put("sampledAt", Instant.now().toString());
        sample.put("usableSpaceBytes", Files.getFileStore(tempDir).getUsableSpace());
        sample.put("runtimePid", status.pid());
        sample.put("runtimeCpuMs", OtelRuntimeSoakSupport.cpuMillis(status.pid()));
        sample.put("runtimeRestartCount", status.restartCount());
        sample.put("failureCode", status.failureCode().name());
        sample.put("metricsQueueRequests", observed(status.telemetry().queueSizeBySignal().metrics()));
        sample.put("logsQueueRequests", observed(status.telemetry().queueSizeBySignal().logs()));
        sample.put("tracesQueueRequests", observed(status.telemetry().queueSizeBySignal().traces()));
        sample.put("metricsQueueCapacity", observed(status.telemetry().queueCapacityBySignal().metrics()));
        sample.put("logsQueueCapacity", observed(status.telemetry().queueCapacityBySignal().logs()));
        sample.put("tracesQueueCapacity", observed(status.telemetry().queueCapacityBySignal().traces()));
        sample.put("backendActiveWorkers", backend.activeWorkerCount());
        sample.put("backendPendingTasks", backend.currentTaskQueueDepth());
        sample.put("backendLargestWorkerCount", backend.largestWorkerCount());
        sample.put("backendMaximumTaskQueueDepth", backend.maximumTaskQueueDepth());
        return sample;
    }

    private Map<String, Object> event(String event, String reasonCode) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("event", event);
        value.put("sampledAt", Instant.now().toString());
        value.put("reasonCode", reasonCode);
        return value;
    }

    private Long observed(ManagedOtelRuntimeStatus.ObservedLong value) {
        return value.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE ? value.value() : null;
    }

    private void requireCapacity(Path path) throws Exception {
        if (Files.getFileStore(path).getUsableSpace() < MINIMUM_USABLE_SPACE_BYTES) {
            throw new SoakUnavailableException("insufficient_disk_space");
        }
    }

    private void requireRuntimeDataBound(OtelRuntimeProperties properties) {
        long storageBytes = OtelRuntimeFaultLoadSupport.storageBytes(properties);
        if (storageBytes < 0 || storageBytes > MAXIMUM_RUNTIME_DATA_BYTES) {
            throw new SoakUnavailableException("runtime_data_bound_unavailable");
        }
    }

    private void sleepUntil(long deadline) throws InterruptedException {
        while (System.nanoTime() < deadline) {
            long remainingMillis = Duration.ofNanos(deadline - System.nanoTime()).toMillis();
            Thread.sleep(Math.max(1, Math.min(remainingMillis, 1000)));
        }
    }

    private Duration durationProperty(String name, Duration defaultValue) {
        return Duration.parse(System.getProperty(name, defaultValue.toString()));
    }

    private void validateSchedule(Duration duration, Duration interval) {
        if (duration.isNegative() || duration.isZero() || duration.compareTo(Duration.ofHours(25)) > 0) {
            throw new IllegalArgumentException("soak duration must be positive and at most 25 hours");
        }
        if (interval.isNegative() || interval.isZero() || interval.compareTo(duration) > 0) {
            throw new IllegalArgumentException("soak interval must be positive and at most the duration");
        }
        long samples = (duration.toNanos() + interval.toNanos() - 1) / interval.toNanos();
        if (samples + 2 > MAXIMUM_SAMPLES) {
            throw new IllegalArgumentException("soak sample count exceeds the bounded report limit");
        }
    }

    private String runtimeBinary() {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the opt-in soak gate");
        return runtimeBinary;
    }

    private record CycleObservation(LoadObservation load, long recoveryMillis) {
    }

    private static final class SoakUnavailableException extends RuntimeException {

        private final String reasonCode;

        private SoakUnavailableException(String reasonCode) {
            super(reasonCode);
            this.reasonCode = reasonCode;
        }

        private String reasonCode() {
            return reasonCode;
        }
    }

    private static final class GuardedResources implements AutoCloseable {

        private final AtomicBoolean closed = new AtomicBoolean();
        private final OtelRuntimeFaultBackend backend;
        private volatile OtelRuntimeSupervisor supervisor;

        private GuardedResources(OtelRuntimeFaultBackend backend) {
            this.backend = backend;
        }

        private void supervisor(OtelRuntimeSupervisor supervisor) {
            this.supervisor = supervisor;
        }

        @Override
        public void close() {
            if (!closed.compareAndSet(false, true)) {
                return;
            }
            OtelRuntimeSupervisor current = supervisor;
            if (current != null) {
                current.close();
            }
            backend.close();
        }
    }
}
