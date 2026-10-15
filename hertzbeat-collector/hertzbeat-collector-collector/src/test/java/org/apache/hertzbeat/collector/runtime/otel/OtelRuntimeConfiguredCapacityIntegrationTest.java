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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.BackendFault;
import org.apache.hertzbeat.collector.runtime.otel.OtelRuntimeFaultLoadSupport.LoadProfile;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeConfiguredCapacityIntegrationTest {

    private static final String RUNTIME_BINARY_ENV = "HERTZBEAT_OTEL_RUNTIME_BINARY";
    private static final int TEST_STORAGE_LIMIT_BYTES = 1024 * 1024;
    private static final int MAXIMUM_PRESSURE_REQUESTS = 4;

    @TempDir
    private Path tempDir;

    @Test
    void preservesConfirmedQueueDataAndRecoversAfterConfiguredStorageExhaustion() throws Exception {
        String runtimeBinary = runtimeBinary();
        String confirmedMarker = "capacity-confirmed-before-full";
        String recoveredMarker = "capacity-after-recovery";
        long runtimePid = -1;
        int pressureRequests = 0;
        long recoveryMillis = -1;
        ManagedOtelRuntimeStatus full = null;
        List<Map<String, Object>> pressureObservations = new java.util.ArrayList<>();
        OtelRuntimeFaultBackend backend = new OtelRuntimeFaultBackend();
        try (backend) {
            backend.start();
            backend.fault(BackendFault.HTTP_503);
            backend.watchFaultMarker(confirmedMarker);
            OtelRuntimeProperties properties = OtelRuntimeFaultLoadSupport.properties(
                    tempDir, runtimeBinary, backend.port());
            OtelRuntimeSupervisor supervisor = OtelRuntimeFaultLoadSupport.supervisor(
                    properties, new OtelRuntimeConfiguredCapacityRenderer(TEST_STORAGE_LIMIT_BYTES));
            OtelRuntimeStatusProvider statusProvider = OtelRuntimeFaultLoadSupport.statusProvider(
                    properties, supervisor);
            try {
                supervisor.start();
                runtimePid = supervisor.snapshot().pid();
                String activeConfig = Files.readString(new OtelRuntimeConfigRenderer().activePath(properties));
                assertFalse(activeConfig.contains("max_size: 67108864"));
                assertTrue(activeConfig.contains("max_size: " + TEST_STORAGE_LIMIT_BYTES));

                OtelRuntimeFaultLoadSupport.sendItems(
                        properties.getOtlpHttpEndpoint(), LoadProfile.METRICS, confirmedMarker, 512);
                backend.awaitFaultPayload(confirmedMarker, Duration.ofSeconds(20));
                OtelRuntimeFaultLoadSupport.awaitQueued(
                        statusProvider, LoadProfile.METRICS, Duration.ofSeconds(20));
                assertTrue(OtelRuntimeFaultLoadSupport.storageBytes(properties) > 0);

                for (int request = 0; request < MAXIMUM_PRESSURE_REQUESTS && full == null; request++) {
                    OtelRuntimeFaultLoadSupport.sendLoad(
                            properties.getOtlpHttpEndpoint(), LoadProfile.METRICS, "capacity-pressure-" + request);
                    pressureRequests++;
                    full = awaitStorageFull(statusProvider, Duration.ofMillis(500));
                    ManagedOtelRuntimeStatus sample = statusProvider.status();
                    Map<String, Object> pressureObservation = new LinkedHashMap<>();
                    pressureObservation.put("pressureRequests", pressureRequests);
                    pressureObservation.put("storageBytes", OtelRuntimeFaultLoadSupport.storageBytes(properties));
                    pressureObservation.put("failureCode", sample.failureCode().name());
                    pressureObservation.put("metricsQueueRequests", observedValue(
                            sample.telemetry().queueSizeBySignal().metrics()));
                    pressureObservation.put("metricsEnqueueFailures", observedValue(
                            sample.telemetry().enqueueFailed().metrics()));
                    pressureObservation.put("diagnosticCode", new OtelRuntimeDiagnosticsReader(
                            new OtelRuntimeFailureClassifier()).latestFailure(properties).name());
                    pressureObservations.add(pressureObservation);
                    OtelRuntimeFaultLoadSupport.writeM7ThreeReport(
                            "configured-capacity-progress.json", pressureObservations);
                }

                assertNotNull(full, "official file_storage did not report its configured capacity exhaustion");
                assertEquals(runtimePid, full.pid());
                assertEquals(0, full.restartCount());
                assertEquals(ManagedOtelRuntimeStatus.RuntimeState.RUNNING, full.state());
                assertTrue(availablePositive(full.telemetry().enqueueFailed().metrics()));

                long recoveryStarted = System.nanoTime();
                backend.recover();
                backend.awaitSuccessful(LoadProfile.METRICS, confirmedMarker, Duration.ofSeconds(90));
                ManagedOtelRuntimeStatus drained = OtelRuntimeFaultLoadSupport.awaitDrained(
                        statusProvider, LoadProfile.METRICS, Duration.ofSeconds(90));
                recoveryMillis = Duration.ofNanos(System.nanoTime() - recoveryStarted).toMillis();
                assertEquals(runtimePid, drained.pid());
                assertEquals(0, drained.restartCount());
                assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, drained.failureCode());

                OtelRuntimeFaultLoadSupport.sendItems(
                        properties.getOtlpHttpEndpoint(), LoadProfile.METRICS, recoveredMarker, 1);
                backend.awaitSuccessful(LoadProfile.METRICS, recoveredMarker, Duration.ofSeconds(30));
                ManagedOtelRuntimeStatus recovered = OtelRuntimeFaultLoadSupport.awaitDrained(
                        statusProvider, LoadProfile.METRICS, Duration.ofSeconds(30));
                assertEquals(ManagedOtelRuntimeStatus.FailureCode.NONE, recovered.failureCode());
                assertEquals(runtimePid, recovered.pid());
            } finally {
                supervisor.close();
            }
        }
        assertTrue(runtimePid > 0);
        OtelRuntimeFaultLoadSupport.awaitProcessStopped(runtimePid, Duration.ofSeconds(5));
        assertTrue(backend.isStopped());
        assertTrue(backend.largestWorkerCount() <= OtelRuntimeFaultBackend.WORKER_LIMIT);
        assertTrue(backend.maximumTaskQueueDepth() <= OtelRuntimeFaultBackend.TASK_QUEUE_LIMIT);

        Map<String, Object> observation = new LinkedHashMap<>();
        observation.put("configuredFileStorageLimitBytes", TEST_STORAGE_LIMIT_BYTES);
        observation.put("pressureRequests", pressureRequests);
        observation.put("recoveryElapsedMs", recoveryMillis);
        observation.put("runtimeRestartCount", 0);
        observation.put("confirmedPreExhaustionItemDelivered", true);
        observation.put("postRecoveryItemDelivered", true);
        OtelRuntimeFaultLoadSupport.writeM7ThreeReport("configured-capacity.json", List.of(observation));
    }

    private ManagedOtelRuntimeStatus awaitStorageFull(
            OtelRuntimeStatusProvider statusProvider, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        do {
            ManagedOtelRuntimeStatus status = statusProvider.status();
            if (status.failureCode() == ManagedOtelRuntimeStatus.FailureCode.STORAGE_FULL) {
                return status;
            }
            Thread.sleep(50);
        } while (System.nanoTime() < deadline);
        return null;
    }

    private boolean availablePositive(ManagedOtelRuntimeStatus.ObservedLong observed) {
        return observed.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE && observed.value() > 0;
    }

    private Long observedValue(ManagedOtelRuntimeStatus.ObservedLong observed) {
        return observed.state() == ManagedOtelRuntimeStatus.ValueState.AVAILABLE ? observed.value() : null;
    }

    private String runtimeBinary() {
        String runtimeBinary = System.getenv(RUNTIME_BINARY_ENV);
        Assumptions.assumeTrue(runtimeBinary != null && !runtimeBinary.isBlank(),
                () -> RUNTIME_BINARY_ENV + " is required for configured-capacity integration proof");
        return runtimeBinary;
    }
}
