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

package org.apache.hertzbeat.observability.storage;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.observability.fixture.GreptimeE2eSupport;
import org.apache.hertzbeat.observability.fixture.VectorE2eContainer;
import org.apache.hertzbeat.startup.TrustedStartup;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeDbDataStorage;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.Testcontainers;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * E2E tests for GreptimeDB log storage.
 */
@SpringBootTest(classes = org.apache.hertzbeat.startup.HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TrustedStartup
@TestPropertySource(properties = {
        "warehouse.store.duckdb.enabled=false"
})
@Slf4j
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class GreptimeLogStorageE2eTest extends GreptimeE2eSupport {

    private static final Duration CONTAINER_STARTUP_TIMEOUT = Duration.ofSeconds(120);
    private static final String VECTOR_SERVICE_NAME = "hertzbeat-vector-e2e";

    @LocalServerPort
    private int port;

    @Autowired
    private GreptimeDbDataStorage greptimeDbDataStorage;

    static GenericContainer<?> vector;
    private long vectorStartedAtMillis;

    @BeforeAll
    void setUpAll() throws InterruptedException {
        initializeAdministrator();
        // Expose host ports for testcontainers
        Testcontainers.exposeHostPorts(port);

        // Wait for HertzBeat to be fully ready before starting Vector
        log.info("Waiting for HertzBeat to be fully ready on port {}...", port);
        Thread.sleep(5000); // Give HertzBeat time to fully initialize

        vectorStartedAtMillis = System.currentTimeMillis();
        vector = VectorE2eContainer.create(
                port, CONTAINER_STARTUP_TIMEOUT,
                outputFrame -> log.info("Vector: {}", outputFrame.getUtf8String()));
        vector.start();
    }

    @Test
    void testLogStorageToGreptimeDb() {
        log.info("GreptimeDbDataStorage serverAvailable: {}", greptimeDbDataStorage.isServerAvailable());

        // The production OTLP path writes directly to GreptimeDB; verify the persisted rows.
        await().atMost(Duration.ofSeconds(60))
                .pollInterval(Duration.ofSeconds(2))
                .untilAsserted(() -> {
                    List<LogEntry> storedLogs = queryStoredLogs();
                    log.info("Queried {} logs from GreptimeDB", storedLogs.size());
                    assertFalse(storedLogs.isEmpty(), "Should have logs stored in GreptimeDB");
                    LogEntry firstLog = storedLogs.get(0);
                    assertNotNull(firstLog.getBody(), "Stored log body should not be null");
                    assertNotNull(firstLog.getSeverityText(), "Stored log severity should not be null");
                });
    }

    /**
     * Helper method to query stored logs directly from GreptimeDB
     */
    private List<LogEntry> queryStoredLogs() {
        // Scope the query to this Vector run so rows from other E2E tests cannot satisfy the proof.
        List<LogEntry> result = greptimeDbDataStorage.queryLogsByMultipleConditions(
                vectorStartedAtMillis, System.currentTimeMillis(), null, null, null, null, null,
                Collections.emptySet(), true, null, VECTOR_SERVICE_NAME, null, null);
        log.info("queryLogsByMultipleConditions returned {} entries", result.size());
        return result;
    }
}
