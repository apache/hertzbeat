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

package org.apache.hertzbeat.observability.ingestion;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.observability.fixture.GreptimeE2eSupport;
import org.apache.hertzbeat.observability.fixture.VectorE2eContainer;
import org.apache.hertzbeat.startup.TrustedStartup;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.Testcontainers;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * E2E tests for log ingestion.
 */
@SpringBootTest(classes = org.apache.hertzbeat.startup.HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TrustedStartup
@Slf4j
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class LogIngestionE2eTest extends GreptimeE2eSupport {

    private static final Duration CONTAINER_STARTUP_TIMEOUT = Duration.ofSeconds(120);

    @LocalServerPort
    private int port;

    @Autowired
    private CommonDataQueue commonDataQueue;

    static GenericContainer<?> vector;

    @BeforeAll
    void setUpAll() throws InterruptedException {
        initializeAdministrator();
        Testcontainers.exposeHostPorts(port);

        // Wait for HertzBeat to be fully ready before starting Vector
        log.info("Waiting for HertzBeat to be fully ready on port {}...", port);
        Thread.sleep(5000); // Give HertzBeat time to fully initialize

        vector = VectorE2eContainer.create(
                port, CONTAINER_STARTUP_TIMEOUT,
                outputFrame -> log.info("Vector: {}", outputFrame.getUtf8String()));
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
