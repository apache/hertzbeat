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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

class OtelRuntimeSupervisorTest {

    @TempDir
    private Path tempDir;

    private OtelRuntimeProperties properties;
    private OtelRuntimeBinaryResolver resolver;
    private OtelRuntimeConfigTransaction configTransaction;
    private OtelRuntimeProcessLauncher launcher;
    private OtelRuntimeHealthClient healthClient;
    private OtelRuntimeSupervisor supervisor;

    @BeforeEach
    void setUp() throws Exception {
        properties = new OtelRuntimeProperties();
        properties.setEnabled(true);
        properties.setHome(tempDir);
        properties.setCollectorId("collector-phase0");
        properties.setWorkspaceId("workspace-phase0");
        properties.setToken("token-phase0");
        properties.setExportEndpoint(URI.create("http://127.0.0.1:1157/api/otlp"));
        properties.setRestartDelay(Duration.ZERO);
        properties.setStartupTimeout(Duration.ofMillis(200));
        properties.setHealthTimeout(Duration.ofMillis(50));
        resolver = mock(OtelRuntimeBinaryResolver.class);
        configTransaction = mock(OtelRuntimeConfigTransaction.class);
        launcher = mock(OtelRuntimeProcessLauncher.class);
        healthClient = mock(OtelRuntimeHealthClient.class);
        Path binary = Files.createFile(tempDir.resolve("hertzbeat-otel-runtime"));
        Path candidate = Files.createFile(tempDir.resolve("runtime.yaml.candidate"));
        Path config = tempDir.resolve("runtime.yaml");
        Path lastKnownGood = tempDir.resolve("runtime.yaml.last-known-good");
        OtelRuntimeConfigTransaction.PreparedConfig prepared =
                new OtelRuntimeConfigTransaction.PreparedConfig(candidate, config, lastKnownGood, 1, 0);
        when(resolver.resolve()).thenReturn(binary);
        when(configTransaction.prepare(properties)).thenReturn(prepared);
        when(configTransaction.commit(prepared)).thenReturn(config);
        when(healthClient.isHealthy(any(), any())).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        if (supervisor != null) {
            supervisor.close();
        }
    }

    @Test
    void validatesThenStartsWithOneCollectorIdentity() throws Exception {
        Process validation = successfulValidation();
        Process runtime = runningProcess(4201, new CompletableFuture<>());
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean()))
                .thenReturn(validation, runtime);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);

        supervisor.start();

        assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
        assertEquals(4201, supervisor.snapshot().pid());
        assertEquals(1, supervisor.activeRevision());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> environment = ArgumentCaptor.forClass(Map.class);
        verify(launcher, atLeastOnce()).start(any(), any(), any(), any(), environment.capture(), anyBoolean());
        assertEquals("collector-phase0", environment.getValue().get("HERTZBEAT_COLLECTOR_ID"));
        assertEquals("workspace-phase0", environment.getValue().get("HERTZBEAT_WORKSPACE_ID"));
        assertEquals("token-phase0", environment.getValue().get("HERTZBEAT_OTLP_TOKEN"));
        assertEquals(tempDir.resolve("data/otel-runtime").toString(),
                environment.getValue().get("HERTZBEAT_OTEL_FILE_STORAGE_DIR"));
        InOrder activationOrder = inOrder(launcher, configTransaction);
        activationOrder.verify(launcher).start(any(), any(), any(), any(), anyMap(), anyBoolean());
        activationOrder.verify(configTransaction).commit(any());
        activationOrder.verify(launcher).start(any(), any(), any(), any(), anyMap(), anyBoolean());
    }

    @Test
    void unexpectedExitDegradesThenRestartsWithoutStoppingJava() throws Exception {
        CompletableFuture<Process> firstExit = new CompletableFuture<>();
        Process firstRuntime = runningProcess(4201, firstExit);
        when(firstRuntime.exitValue()).thenReturn(137);
        Process secondRuntime = runningProcess(4202, new CompletableFuture<>());
        Process firstValidation = successfulValidation();
        Process secondValidation = successfulValidation();
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean()))
                .thenReturn(firstValidation, firstRuntime, secondValidation, secondRuntime);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);
        supervisor.start();

        firstExit.complete(firstRuntime);

        await(() -> supervisor.snapshot().pid() == 4202 && supervisor.snapshot().state() == OtelRuntimeState.RUNNING);
        assertEquals(1, supervisor.snapshot().restartCount());
        assertEquals("", supervisor.snapshot().lastError());
    }

    @Test
    void manualRecoveryFromOpenCircuitStartsWithFreshFailureWindow() throws Exception {
        properties.setMaxRestarts(2);
        properties.setRestartDelay(Duration.ofHours(1));
        Process firstFailure = failedValidation();
        Process secondFailure = failedValidation();
        Process recoveredValidation = successfulValidation();
        CompletableFuture<Process> recoveredExit = new CompletableFuture<>();
        Process recoveredRuntime = runningProcess(4203, recoveredExit);
        when(recoveredRuntime.exitValue()).thenReturn(137);
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean()))
                .thenReturn(firstFailure, secondFailure, recoveredValidation, recoveredRuntime);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);

        supervisor.start();
        supervisor.start();
        assertEquals(OtelRuntimeState.FAILED, supervisor.snapshot().state());

        supervisor.start();
        assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
        assertEquals(4203, supervisor.snapshot().pid());
        recoveredExit.complete(recoveredRuntime);

        await(() -> supervisor.snapshot().state() != OtelRuntimeState.RUNNING);
        assertEquals(OtelRuntimeState.DEGRADED, supervisor.snapshot().state());
        assertEquals(3, supervisor.snapshot().restartCount());
    }

    @Test
    void validationFailureIsDegradedAndDoesNotLaunchRuntime() throws Exception {
        properties.setRestartDelay(Duration.ofHours(1));
        Process validation = mock(Process.class);
        when(validation.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(validation.exitValue()).thenReturn(1);
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean())).thenReturn(validation);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);

        supervisor.start();

        assertEquals(OtelRuntimeState.DEGRADED, supervisor.snapshot().state());
        assertTrue(supervisor.snapshot().lastError().contains("validation"));
        verify(healthClient, never()).isHealthy(any(), any());
        verify(configTransaction, never()).commit(any());
        verify(configTransaction).discard(any());
    }

    @Test
    void missingManagedIntakeTokenDegradesWithoutLaunchingRuntime() throws Exception {
        properties.setToken(" ");
        properties.setRestartDelay(Duration.ofHours(1));
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);

        supervisor.start();

        assertEquals(OtelRuntimeState.DEGRADED, supervisor.snapshot().state());
        assertTrue(supervisor.snapshot().lastError().contains("intake token"));
        verify(resolver, never()).resolve();
        verify(launcher, never()).start(any(), any(), any(), any(), anyMap(), anyBoolean());
    }

    @Test
    void opensRecoveryCircuitAtConfiguredFailureLimit() throws Exception {
        properties.setMaxRestarts(1);
        Process validation = mock(Process.class);
        when(validation.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(validation.exitValue()).thenReturn(1);
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean())).thenReturn(validation);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);

        supervisor.start();

        assertEquals(OtelRuntimeState.FAILED, supervisor.snapshot().state());
        assertEquals(1, supervisor.snapshot().restartCount());
    }

    @Test
    void unhealthyStartupTerminatesChildBeforeDegrading() throws Exception {
        properties.setRestartDelay(Duration.ofHours(1));
        properties.setStartupTimeout(Duration.ofMillis(50));
        Process runtime = runningProcess(4201, new CompletableFuture<>());
        when(runtime.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(healthClient.isHealthy(any(), any())).thenReturn(false);
        Process validation = successfulValidation();
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean()))
                .thenReturn(validation, runtime);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);

        supervisor.start();

        assertEquals(OtelRuntimeState.DEGRADED, supervisor.snapshot().state());
        verify(runtime).destroy();
    }

    @Test
    void unhealthyActivatedCandidateRollsBackAndStartsLastKnownGoodOnce() throws Exception {
        properties.setRestartDelay(Duration.ofHours(1));
        properties.setStartupTimeout(Duration.ofMillis(50));
        Process firstRuntime = runningProcess(4201, new CompletableFuture<>());
        when(firstRuntime.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        Process recoveredRuntime = runningProcess(4202, new CompletableFuture<>());
        Process firstValidation = successfulValidation();
        Process recoveredValidation = successfulValidation();
        when(healthClient.isHealthy(any(), any())).thenReturn(false, true);
        when(configTransaction.rollback(any())).thenReturn(true);
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean()))
                .thenReturn(firstValidation, firstRuntime, recoveredValidation, recoveredRuntime);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);

        supervisor.start();

        assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
        assertEquals(4202, supervisor.snapshot().pid());
        assertEquals(1, supervisor.snapshot().restartCount());
        assertTrue(supervisor.snapshot().lastError().contains("did not become ready"));
        assertEquals(0, supervisor.activeRevision());
        verify(firstRuntime).destroy();
        verify(configTransaction).rollback(any());
    }

    @Test
    void normalStopTerminatesChildWithoutSchedulingRecovery() throws Exception {
        CompletableFuture<Process> exit = new CompletableFuture<>();
        Process runtime = runningProcess(4201, exit);
        when(runtime.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        Process validation = successfulValidation();
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean()))
                .thenReturn(validation, runtime);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);
        supervisor.start();

        supervisor.stop();
        exit.complete(runtime);

        assertEquals(OtelRuntimeState.STOPPED, supervisor.snapshot().state());
        verify(runtime).destroy();
        assertEquals(0, supervisor.snapshot().restartCount());
    }

    @Test
    void rejectsRemoteCandidateWithoutStoppingActiveRuntime() throws Exception {
        Process initialValidation = successfulValidation();
        Process activeRuntime = runningProcess(4201, new CompletableFuture<>());
        Process rejectedValidation = mock(Process.class);
        when(rejectedValidation.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(rejectedValidation.exitValue()).thenReturn(1);
        OtelRuntimeConfigTransaction.PreparedConfig revisionTwo = preparedConfig(2, 1);
        when(configTransaction.prepare(properties)).thenReturn(preparedConfig(1, 0), revisionTwo);
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean()))
                .thenReturn(initialValidation, activeRuntime, rejectedValidation);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);
        supervisor.start();

        supervisor.apply(config(2, Duration.ofSeconds(60)));

        await(() -> supervisor.snapshot().lastError().contains("validation"));
        assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
        assertEquals(4201, supervisor.snapshot().pid());
        assertEquals(1, supervisor.activeRevision());
        assertEquals(1, supervisor.sourceStatuses().stream()
                .filter(status -> status.state() == ManagedOtelRuntimeStatus.SourceState.REJECTED)
                .count());
        verify(activeRuntime, never()).destroy();
        verify(configTransaction).discard(revisionTwo);
    }

    @Test
    void activatesNewerRemoteConfigAndStopsPreviousRuntime() throws Exception {
        Process initialValidation = successfulValidation();
        Process activeRuntime = runningProcess(4201, new CompletableFuture<>());
        when(activeRuntime.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        Process updatedValidation = successfulValidation();
        Process updatedRuntime = runningProcess(4202, new CompletableFuture<>());
        OtelRuntimeConfigTransaction.PreparedConfig revisionTwo = preparedConfig(2, 1);
        when(configTransaction.prepare(properties)).thenReturn(preparedConfig(1, 0), revisionTwo);
        when(configTransaction.commit(any())).thenReturn(tempDir.resolve("runtime.yaml"));
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean()))
                .thenReturn(initialValidation, activeRuntime, updatedValidation, updatedRuntime);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, configTransaction, launcher, healthClient);
        supervisor.start();

        supervisor.apply(config(2, Duration.ofSeconds(60)));

        await(() -> supervisor.activeRevision() == 2 && supervisor.snapshot().pid() == 4202);
        verify(activeRuntime).destroy();
        assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
        assertEquals(1, supervisor.sourceStatuses().size());
        assertEquals(2, supervisor.sourceStatuses().getFirst().revision());
    }

    private ManagedOtelRuntimeConfig config(long revision) {
        return config(revision, Duration.ofSeconds(30));
    }

    private ManagedOtelRuntimeConfig config(long revision, Duration interval) {
        return new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION, revision, true, interval);
    }

    private OtelRuntimeConfigTransaction.PreparedConfig preparedConfig(long desiredRevision, long activeRevision)
            throws Exception {
        return new OtelRuntimeConfigTransaction.PreparedConfig(
                Files.createTempFile(tempDir, "runtime-", ".candidate"),
                tempDir.resolve("runtime.yaml"),
                tempDir.resolve("runtime.yaml.last-known-good"),
                desiredRevision,
                activeRevision
        );
    }

    private Process successfulValidation() throws Exception {
        Process validation = mock(Process.class);
        when(validation.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(validation.exitValue()).thenReturn(0);
        return validation;
    }

    private Process failedValidation() throws Exception {
        Process validation = mock(Process.class);
        when(validation.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(validation.exitValue()).thenReturn(1);
        return validation;
    }

    private Process runningProcess(long pid, CompletableFuture<Process> exit) {
        Process runtime = mock(Process.class);
        when(runtime.pid()).thenReturn(pid);
        when(runtime.isAlive()).thenReturn(true);
        when(runtime.onExit()).thenReturn(exit);
        return runtime;
    }

    private static void await(BooleanSupplier condition) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
        while (!condition.getAsBoolean() && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        assertTrue(condition.getAsBoolean(), "condition did not become true before deadline");
    }
}
