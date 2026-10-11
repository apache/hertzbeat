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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.BackendFault;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.LoadObservation;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.LoadProfile;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeFaultLoadIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";

    @TempDir
    private Path tempDir;

    @Test
    void drainsBoundedSignalLoadsAcrossRetriableBackendFaultsWithoutRuntimeRestart() throws Exception {
        String runtimeBinary = runtimeBinary();
        List<FaultRound> rounds = List.of(
                new FaultRound(BackendFault.SLOW_RESPONSE, LoadProfile.METRICS, "slow-metrics"),
                new FaultRound(BackendFault.HTTP_429, LoadProfile.LOGS, "rate-limited-logs"),
                new FaultRound(BackendFault.HTTP_503, LoadProfile.TRACES, "unavailable-traces"),
                new FaultRound(BackendFault.CONNECTION_RESET, LoadProfile.MIXED, "reset-mixed"));
        List<Map<String, Object>> report = new ArrayList<>();
        long runtimePid = -1;
        OtelRuntimeFaultBackend backend = new OtelRuntimeFaultBackend();
        try (backend) {
            backend.start();
            OtelRuntimeProperties properties = OtelRuntimeFaultLoadSupport.properties(
                    tempDir, runtimeBinary, backend.port());
            OtelRuntimeSupervisor supervisor = OtelRuntimeFaultLoadSupport.supervisor(properties);
            OtelRuntimeStatusProvider statusProvider = OtelRuntimeFaultLoadSupport.statusProvider(
                    properties, supervisor);
            try {
                supervisor.start();
                long pid = supervisor.snapshot().pid();
                runtimePid = pid;
                for (FaultRound round : rounds) {
                    backend.fault(round.fault());
                    int attemptsBeforeLoad = backend.attemptCount();
                    LoadObservation observation = OtelRuntimeFaultLoadSupport.sendLoad(
                            properties.getOtlpHttpEndpoint(), round.profile(), round.marker());
                    backend.awaitAttemptAfter(attemptsBeforeLoad, Duration.ofSeconds(20));
                    ManagedOtelRuntimeStatus queued = OtelRuntimeFaultLoadSupport.awaitQueued(
                            statusProvider, round.profile(), Duration.ofSeconds(20));
                    assertEquals(pid, queued.pid());
                    assertEquals(0, queued.restartCount());

                    long recoveryStarted = System.nanoTime();
                    backend.recover();
                    backend.awaitSuccessful(round.profile(), round.marker(), Duration.ofSeconds(40));
                    ManagedOtelRuntimeStatus recovered = OtelRuntimeFaultLoadSupport.awaitDrained(
                            statusProvider, round.profile(), Duration.ofSeconds(40));
                    long recoveryMillis = Duration.ofNanos(System.nanoTime() - recoveryStarted).toMillis();
                    assertEquals(pid, recovered.pid());
                    assertEquals(0, recovered.restartCount());
                    assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, recovered.failureCode());
                    report.add(OtelRuntimeFaultLoadSupport.observation(
                            round.fault(), observation, recoveryMillis, pid, properties));
                }
            } finally {
                supervisor.close();
            }
        }
        assertTrue(runtimePid > 0);
        OtelRuntimeFaultLoadSupport.awaitProcessStopped(runtimePid, Duration.ofSeconds(5));
        assertTrue(backend.isStopped());
        assertTrue(backend.largestWorkerCount() <= OtelRuntimeFaultBackend.WORKER_LIMIT);
        assertTrue(backend.maximumTaskQueueDepth() <= OtelRuntimeFaultBackend.TASK_QUEUE_LIMIT);
        OtelRuntimeFaultLoadSupport.writeLocalReport("fault-matrix.json", report);
    }

    @Test
    void rebuildsJavaSupervisorWithPersistentQueuesAndFileOffset() throws Exception {
        String runtimeBinary = runtimeBinary();
        String queuedMarker = "supervisor-rebuild";
        String beforeRebuild = "file line before supervisor rebuild";
        String whileStopped = "file line while supervisor stopped";
        String historical = "historical file line must stay suppressed";
        Set<Long> supervisorThreadsBefore = threadIdsNamed("hertzbeat-otel-runtime-supervisor");
        Set<Long> backendThreadsBefore = threadIdsStartingWith("otel-fault-backend-");
        Path logDirectory = Files.createDirectories(tempDir.resolve("application-logs"));
        Path applicationLog = Files.writeString(logDirectory.resolve("payments.log"), historical + '\n');
        long firstPid = -1;
        long rebuiltPid = -1;
        OtelRuntimeFaultBackend backend = new OtelRuntimeFaultBackend();
        try (backend) {
            backend.start();
            backend.fault(BackendFault.HTTP_503);
            backend.watchFaultMarker(beforeRebuild);
            backend.watchFaultMarker(whileStopped);
            OtelRuntimeProperties properties = OtelRuntimeFaultLoadSupport.properties(
                    tempDir, runtimeBinary, backend.port());
            properties.setFileLogAllowRoots(List.of(logDirectory));
            properties.setFileLogProfiles(Map.of("payments-logs", List.of(applicationLog.toString())));
            properties.setFileLogSources(List.of(
                    new ManagedOtelRuntimeConfig.FileLogSource("payments", "payments-logs")));

            OtelRuntimeSupervisor firstSupervisor = OtelRuntimeFaultLoadSupport.supervisor(properties);
            OtelRuntimeStatusProvider firstStatusProvider = OtelRuntimeFaultLoadSupport.statusProvider(
                    properties, firstSupervisor);
            LoadObservation observation;
            try {
                firstSupervisor.start();
                firstPid = firstSupervisor.snapshot().pid();
                OtelRuntimeFaultLoadSupport.awaitFileConsumerReady(
                        firstStatusProvider, Duration.ofSeconds(15));
                Files.writeString(applicationLog, beforeRebuild + '\n', StandardOpenOption.APPEND);
                observation = OtelRuntimeFaultLoadSupport.sendPersistenceProbe(
                        properties.getOtlpHttpEndpoint(), queuedMarker);
                backend.awaitFaultPayload(beforeRebuild, Duration.ofSeconds(25));
                List<Path> persistedBeforeRebuild = OtelRuntimeFaultLoadSupport.storageFiles(properties);
                assertFalse(persistedBeforeRebuild.isEmpty());
                assertTrue(OtelRuntimeFaultLoadSupport.storageBytes(properties) > 0);
            } finally {
                firstSupervisor.close();
            }
            assertTrue(firstPid > 0);
            OtelRuntimeFaultLoadSupport.awaitProcessStopped(firstPid, Duration.ofSeconds(5));
            awaitThreadIds(
                    "hertzbeat-otel-runtime-supervisor", supervisorThreadsBefore, Duration.ofSeconds(5));

            Files.writeString(applicationLog, whileStopped + '\n', StandardOpenOption.APPEND);
            OtelRuntimeSupervisor rebuiltSupervisor = OtelRuntimeFaultLoadSupport.supervisor(properties);
            OtelRuntimeStatusProvider rebuiltStatusProvider = OtelRuntimeFaultLoadSupport.statusProvider(
                    properties, rebuiltSupervisor);
            try {
                rebuiltSupervisor.start();
                rebuiltPid = rebuiltSupervisor.snapshot().pid();
                assertNotEquals(firstPid, rebuiltPid);
                backend.awaitFaultPayload(whileStopped, Duration.ofSeconds(25));
                long recoveryStarted = System.nanoTime();
                backend.recover();
                backend.awaitSuccessful(LoadProfile.MIXED, queuedMarker, Duration.ofSeconds(40));
                backend.awaitSuccessfulLog(beforeRebuild, Duration.ofSeconds(40));
                backend.awaitSuccessfulLog(whileStopped, Duration.ofSeconds(40));
                ManagedOtelRuntimeStatus recovered = OtelRuntimeFaultLoadSupport.awaitDrained(
                        rebuiltStatusProvider, LoadProfile.MIXED, Duration.ofSeconds(40));
                long recoveryMillis = Duration.ofNanos(System.nanoTime() - recoveryStarted).toMillis();
                assertEquals(rebuiltPid, recovered.pid());
                assertEquals(1, backend.successfulOccurrences(beforeRebuild));
                assertEquals(1, backend.successfulOccurrences(whileStopped));
                assertFalse(backend.successfulPayloadContains(historical));
                assertFalse(OtelRuntimeFaultLoadSupport.storageFiles(properties).isEmpty());
                assertTrue(OtelRuntimeFaultLoadSupport.storageBytes(properties) > 0);
                OtelRuntimeFaultLoadSupport.writeLocalReport("supervisor-rebuild.json", List.of(
                        OtelRuntimeFaultLoadSupport.observation(
                                BackendFault.HTTP_503, observation, recoveryMillis, rebuiltPid, properties)));
            } finally {
                rebuiltSupervisor.close();
            }
        }
        assertTrue(firstPid > 0);
        assertTrue(rebuiltPid > 0);
        OtelRuntimeFaultLoadSupport.awaitProcessStopped(firstPid, Duration.ofSeconds(5));
        OtelRuntimeFaultLoadSupport.awaitProcessStopped(rebuiltPid, Duration.ofSeconds(5));
        awaitThreadIds(
                "hertzbeat-otel-runtime-supervisor", supervisorThreadsBefore, Duration.ofSeconds(5));
        awaitThreadIdsStartingWith("otel-fault-backend-", backendThreadsBefore, Duration.ofSeconds(5));
        assertTrue(backend.isStopped());
        assertTrue(backend.largestWorkerCount() <= OtelRuntimeFaultBackend.WORKER_LIMIT);
        assertTrue(backend.maximumTaskQueueDepth() <= OtelRuntimeFaultBackend.TASK_QUEUE_LIMIT);
    }

    private static Set<Long> threadIdsNamed(String name) {
        return Thread.getAllStackTraces().keySet().stream()
                .filter(Thread::isAlive)
                .filter(thread -> name.equals(thread.getName()))
                .map(Thread::threadId)
                .collect(Collectors.toSet());
    }

    private static Set<Long> threadIdsStartingWith(String prefix) {
        return Thread.getAllStackTraces().keySet().stream()
                .filter(Thread::isAlive)
                .filter(thread -> thread.getName().startsWith(prefix))
                .map(Thread::threadId)
                .collect(Collectors.toSet());
    }

    private static void awaitThreadIds(String name, Set<Long> expected, Duration timeout)
            throws InterruptedException {
        awaitThreadIds(() -> threadIdsNamed(name), expected, timeout);
    }

    private static void awaitThreadIdsStartingWith(String prefix, Set<Long> expected, Duration timeout)
            throws InterruptedException {
        awaitThreadIds(() -> threadIdsStartingWith(prefix), expected, timeout);
    }

    private static void awaitThreadIds(
            java.util.function.Supplier<Set<Long>> observed, Set<Long> expected, Duration timeout)
            throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        Set<Long> actual;
        do {
            actual = observed.get();
            if (actual.equals(expected)) {
                return;
            }
            Thread.sleep(50);
        } while (System.nanoTime() < deadline);
        assertEquals(expected, actual);
    }

    private String runtimeBinary() {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for the real runtime fault/load gate");
        return runtimeBinary;
    }

    private record FaultRound(BackendFault fault, LoadProfile profile, String marker) {
    }
}
