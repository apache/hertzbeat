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

package org.apache.hertzbeat.log.storage;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeDbDataStorage;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * E2E tests for GreptimeDB log storage.
 */
@SpringBootTest(classes = org.apache.hertzbeat.startup.HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Slf4j
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class GreptimeLogStorageE2eTest {

    private static final String VECTOR_IMAGE = "timberio/vector:latest-alpine";
    private static final int VECTOR_PORT = 8686;
    private static final String VECTOR_CONFIG_PATH = "/etc/vector/vector.yml";
    private static final String ENV_HERTZBEAT_PORT = "HERTZBEAT_PORT";
    private static final String GREPTIME_IMAGE = "greptime/greptimedb:latest";
    private static final int GREPTIME_HTTP_PORT = 4000;
    private static final int GREPTIME_GRPC_PORT = 4001;
    private static final Duration CONTAINER_STARTUP_TIMEOUT = Duration.ofSeconds(120);

    @LocalServerPort
    private int port;

    @Autowired
    private CommonDataQueue commonDataQueue;

    @Autowired
    private GreptimeDbDataStorage greptimeDbDataStorage;

    static GenericContainer<?> vector;
    static GenericContainer<?> greptimedb;

    static {
        greptimedb = new GenericContainer<>(DockerImageName.parse(GREPTIME_IMAGE))
                .withExposedPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT)
                .withCommand("standalone", "start",
                        "--http-addr", "0.0.0.0:" + GREPTIME_HTTP_PORT,
                        "--rpc-bind-addr", "0.0.0.0:" + GREPTIME_GRPC_PORT)
                .waitingFor(Wait.forListeningPorts(GREPTIME_HTTP_PORT, GREPTIME_GRPC_PORT))
                .withStartupTimeout(CONTAINER_STARTUP_TIMEOUT);
        greptimedb.start();
    }

    @DynamicPropertySource
    static void greptimeProps(DynamicPropertyRegistry r) {
        r.add("warehouse.store.duckdb.enabled", () -> "false");
        r.add("warehouse.store.greptime.enabled", () -> "true");
        r.add("warehouse.store.greptime.http-endpoint", () -> "http://localhost:" + greptimedb.getMappedPort(GREPTIME_HTTP_PORT));
        r.add("warehouse.store.greptime.grpc-endpoints", () -> "localhost:" + greptimedb.getMappedPort(GREPTIME_GRPC_PORT));
        r.add("warehouse.store.greptime.username", () -> "");
        r.add("warehouse.store.greptime.password", () -> "");
    }


    @BeforeAll
    void setUpAll() {
        // Expose host ports for testcontainers
        Testcontainers.exposeHostPorts(port);

        vector = new GenericContainer<>(DockerImageName.parse(VECTOR_IMAGE))
                .withExposedPorts(VECTOR_PORT)
                .withCopyFileToContainer(MountableFile.forClasspathResource("vector.yml"), VECTOR_CONFIG_PATH)
                .withCommand("--config", "/etc/vector/vector.yml", "--verbose")
                .withLogConsumer(outputFrame -> log.info("Vector: {}", outputFrame.getUtf8String()))
                .withNetwork(Network.newNetwork())
                .withEnv(ENV_HERTZBEAT_PORT, String.valueOf(port))
                .waitingFor(Wait.forListeningPort())
                .withStartupTimeout(CONTAINER_STARTUP_TIMEOUT);
        vector.start();
    }

    @Test
    void testLogStorageToGreptimeDb() {

        List<LogEntry> capturedLogs = new ArrayList<>();
        
        // Wait for Vector to generate and send logs to HertzBeat
        await().atMost(Duration.ofSeconds(30))
                .pollInterval(Duration.ofSeconds(3))
                .untilAsserted(() -> {
                    // Poll log entries from the queue (non-blocking)
                    try {
                        LogEntry logEntry = commonDataQueue.pollLogEntry();
                        if (logEntry != null) {
                            capturedLogs.add(logEntry);
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Test interrupted", e);
                    }
                    
                    // Assert that we have captured at least some logs
                    assertFalse(capturedLogs.isEmpty(), "Should have captured at least one log entry");
                });

        // Verify the captured logs
        assertFalse(capturedLogs.isEmpty(), "No logs were captured from Vector");
        LogEntry firstLog = capturedLogs.get(0);
        assertNotNull(firstLog, "First log should not be null");
        assertNotNull(firstLog.getBody(), "Log body should not be null");
        assertNotNull(firstLog.getSeverityText(), "Severity text should not be null");
        
        // Additional wait to ensure logs are persisted to GreptimeDB
        await().atMost(Duration.ofSeconds(30))
                .pollInterval(Duration.ofSeconds(2))
                .untilAsserted(() -> {
                    // Query GreptimeDB directly to verify data persistence
                    List<LogEntry> storedLogs = queryStoredLogs();
                    assertFalse(storedLogs.isEmpty(), "Should have logs stored in GreptimeDB");
                });
    }

    /**
     * Helper method to query stored logs directly from GreptimeDB
     */
    private List<LogEntry> queryStoredLogs() {
        long endTime = System.currentTimeMillis();
        long startTime = endTime - Duration.ofMinutes(5).toMillis(); // Look back 5 minutes
        
        return greptimeDbDataStorage.queryLogsByMultipleConditions(
                startTime, endTime, null, null, null, null);
    }
}
