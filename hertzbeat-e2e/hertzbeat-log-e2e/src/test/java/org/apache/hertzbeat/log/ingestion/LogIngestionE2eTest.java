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

package org.apache.hertzbeat.log.ingestion;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.awaitility.Awaitility.await;

/**
 * E2E tests for log ingestion.
 */
@SpringBootTest(classes = org.apache.hertzbeat.manager.Manager.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Slf4j
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class LogIngestionE2eTest {

    private static final String VECTOR_IMAGE = "timberio/vector:latest-alpine";
    private static final int VECTOR_PORT = 8686;
    private static final String VECTOR_CONFIG_PATH = "/etc/vector/vector.yml";
    private static final String ENV_HERTZBEAT_PORT = "HERTZBEAT_PORT";
    private static final Duration CONTAINER_STARTUP_TIMEOUT = Duration.ofSeconds(120);

    @LocalServerPort
    private int port;

    @Autowired
    private CommonDataQueue commonDataQueue;

    static GenericContainer<?> vector;

    @BeforeAll
    void setUpAll() {
        Testcontainers.exposeHostPorts(port);
        vector = new GenericContainer<>(DockerImageName.parse(VECTOR_IMAGE))
                .withExposedPorts(VECTOR_PORT)
                .withCopyFileToContainer(MountableFile.forClasspathResource("vector.yml"), VECTOR_CONFIG_PATH)
                .withCommand("--config", "/etc/vector/vector.yml", "--verbose")
                .withLogConsumer(outputFrame -> log.info("Vector: {}", outputFrame.getUtf8String()))
                .withNetwork(Network.newNetwork())
                .withEnv(ENV_HERTZBEAT_PORT,String.valueOf(port))
                .waitingFor(Wait.forListeningPort())
                .withStartupTimeout(CONTAINER_STARTUP_TIMEOUT);
        vector.start();
    }

    @Test
    void testLogIngestion() {

        // Start polling for log entries from the queue
        List<LogEntry> capturedLogs = new ArrayList<>();
        
        // Wait for Vector to generate and send demo logs to HertzBeat
        await().atMost(Duration.ofSeconds(60))
                .pollInterval(Duration.ofSeconds(3))
                .untilAsserted(() -> {
                    try {
                        LogEntry logEntry = commonDataQueue.pollLogEntry();
                        if (logEntry != null) {
                            capturedLogs.add(logEntry);
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Test interrupted", e);
                    }
                });

        // Verify the captured logs
        assertFalse(capturedLogs.isEmpty(), "No logs were captured from Vector");
        LogEntry firstLog = capturedLogs.get(0);
        assertNotNull(firstLog, "First log should not be null");
        assertNotNull(firstLog.getBody(), "Log body should not be null");
        assertNotNull(firstLog.getSeverityText(), "Severity text should not be null");
    }
}
