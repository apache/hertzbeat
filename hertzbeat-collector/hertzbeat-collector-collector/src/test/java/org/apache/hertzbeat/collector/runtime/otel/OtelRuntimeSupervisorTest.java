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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;

class OtelRuntimeSupervisorTest {

    @TempDir
    private Path tempDir;

    private OtelRuntimeProperties properties;
    private OtelRuntimeBinaryResolver resolver;
    private OtelRuntimeConfigRenderer renderer;
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
        renderer = mock(OtelRuntimeConfigRenderer.class);
        launcher = mock(OtelRuntimeProcessLauncher.class);
        healthClient = mock(OtelRuntimeHealthClient.class);
        Path binary = Files.createFile(tempDir.resolve("hertzbeat-otel-runtime"));
        Path config = Files.createFile(tempDir.resolve("runtime.yaml"));
        when(resolver.resolve()).thenReturn(binary);
        when(renderer.render(properties)).thenReturn(config);
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
        supervisor = new OtelRuntimeSupervisor(properties, resolver, renderer, launcher, healthClient);

        supervisor.start();

        assertEquals(OtelRuntimeState.RUNNING, supervisor.snapshot().state());
        assertEquals(4201, supervisor.snapshot().pid());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> environment = ArgumentCaptor.forClass(Map.class);
        verify(launcher, atLeastOnce()).start(any(), any(), any(), any(), environment.capture(), anyBoolean());
        assertEquals("collector-phase0", environment.getValue().get("HERTZBEAT_COLLECTOR_ID"));
        assertEquals("workspace-phase0", environment.getValue().get("HERTZBEAT_WORKSPACE_ID"));
        assertEquals("token-phase0", environment.getValue().get("HERTZBEAT_OTLP_TOKEN"));
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
        supervisor = new OtelRuntimeSupervisor(properties, resolver, renderer, launcher, healthClient);
        supervisor.start();

        firstExit.complete(firstRuntime);

        await(() -> supervisor.snapshot().pid() == 4202 && supervisor.snapshot().state() == OtelRuntimeState.RUNNING);
        assertEquals(1, supervisor.snapshot().restartCount());
        assertTrue(supervisor.snapshot().lastError().contains("137"));
    }

    @Test
    void validationFailureIsDegradedAndDoesNotLaunchRuntime() throws Exception {
        properties.setRestartDelay(Duration.ofHours(1));
        Process validation = mock(Process.class);
        when(validation.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(validation.exitValue()).thenReturn(1);
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean())).thenReturn(validation);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, renderer, launcher, healthClient);

        supervisor.start();

        assertEquals(OtelRuntimeState.DEGRADED, supervisor.snapshot().state());
        assertTrue(supervisor.snapshot().lastError().contains("validation"));
        verify(healthClient, never()).isHealthy(any(), any());
    }

    @Test
    void opensRecoveryCircuitAtConfiguredFailureLimit() throws Exception {
        properties.setMaxRestarts(1);
        Process validation = mock(Process.class);
        when(validation.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(validation.exitValue()).thenReturn(1);
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean())).thenReturn(validation);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, renderer, launcher, healthClient);

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
        supervisor = new OtelRuntimeSupervisor(properties, resolver, renderer, launcher, healthClient);

        supervisor.start();

        assertEquals(OtelRuntimeState.DEGRADED, supervisor.snapshot().state());
        verify(runtime).destroy();
    }

    @Test
    void normalStopTerminatesChildWithoutSchedulingRecovery() throws Exception {
        CompletableFuture<Process> exit = new CompletableFuture<>();
        Process runtime = runningProcess(4201, exit);
        when(runtime.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        Process validation = successfulValidation();
        when(launcher.start(any(), any(), any(), any(), anyMap(), anyBoolean()))
                .thenReturn(validation, runtime);
        supervisor = new OtelRuntimeSupervisor(properties, resolver, renderer, launcher, healthClient);
        supervisor.start();

        supervisor.stop();
        exit.complete(runtime);

        assertEquals(OtelRuntimeState.STOPPED, supervisor.snapshot().state());
        verify(runtime).destroy();
        assertEquals(0, supervisor.snapshot().restartCount());
    }

    private Process successfulValidation() throws Exception {
        Process validation = mock(Process.class);
        when(validation.waitFor(anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(validation.exitValue()).thenReturn(0);
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
