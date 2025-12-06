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

package org.apache.hertzbeat.log.alert;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.calculate.periodic.PeriodicAlertRuleScheduler;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.doAnswer;

/**
 * E2E tests for periodic log alert processing.
 */
@SpringBootTest(classes = org.apache.hertzbeat.startup.HertzBeatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Slf4j
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class LogPeriodicAlertE2eTest {

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
    PeriodicAlertRuleScheduler periodicAlertRuleScheduler;

    AlertDefine errorCountAlertByGroup;
    AlertDefine errorCountAlertByIndividual;

    @SpyBean
    private AlarmCommonReduce alarmCommonReduce;

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
        // Configure GreptimeDB storage
        r.add("warehouse.store.duckdb.enabled", () -> "false");
        r.add("warehouse.store.greptime.enabled", () -> "true");
        r.add("warehouse.store.greptime.http-endpoint", () -> "http://localhost:" + greptimedb.getMappedPort(GREPTIME_HTTP_PORT));
        r.add("warehouse.store.greptime.grpc-endpoints", () -> "localhost:" + greptimedb.getMappedPort(GREPTIME_GRPC_PORT));
        r.add("warehouse.store.greptime.username", () -> "");
        r.add("warehouse.store.greptime.password", () -> "");
    }

    @BeforeAll
    void setUpAll() {
        // Setup test alert definitions
        setupTestAlertDefines();
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
    void testPeriodicLogAlertWithIndividualAlert() {

        List<SingleAlert> capturedAlerts = new ArrayList<>();

        doAnswer(invocation -> {
            SingleAlert alert = invocation.getArgument(0);
            capturedAlerts.add(alert);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarm(any(SingleAlert.class));

        periodicAlertRuleScheduler.updateSchedule(errorCountAlertByIndividual);

        // Wait for periodic individual alert to be generated through AlarmCommonReduce
        await().atMost(Duration.ofSeconds(60))
                .pollInterval(Duration.ofSeconds(3))
                .untilAsserted(() -> assertFalse(capturedAlerts.isEmpty(),
                        "Should have generated at least one periodic individual alert"));

        // Verify alert properties
        SingleAlert firstAlert = capturedAlerts.get(0);
        assertNotNull(firstAlert, "First periodic alert should not be null");
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, firstAlert.getStatus(), "Alert should be in firing status");
        assertNotNull(firstAlert.getLabels(), "Alert should have labels");
        assertTrue(firstAlert.getLabels().containsKey(CommonConstants.LABEL_ALERT_SEVERITY), "Alert should have severity label");
        assertEquals(CommonConstants.ALERT_SEVERITY_CRITICAL, firstAlert.getLabels().get(CommonConstants.LABEL_ALERT_SEVERITY), "Alert should have critical severity");
    }

    @Test
    void testPeriodicLogAlertWithGroupAlert() {

        List<List<SingleAlert>> capturedGroupAlerts = new ArrayList<>();

        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<SingleAlert> alerts = invocation.getArgument(1);
            capturedGroupAlerts.add(alerts);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarmGroup(anyMap(), anyList());

        periodicAlertRuleScheduler.updateSchedule(errorCountAlertByGroup);

        await().atMost(Duration.ofSeconds(60))
                .pollInterval(Duration.ofSeconds(3))
                .untilAsserted(() -> assertFalse(capturedGroupAlerts.isEmpty(),
                        "Should have generated periodic error count group alert"));

        List<SingleAlert> groupAlerts = capturedGroupAlerts.get(0);

        assertNotNull(groupAlerts, "Group alerts should not be null");
        assertFalse(groupAlerts.isEmpty(), "Group alerts should not be empty");

        SingleAlert anyAlert = groupAlerts.get(0);
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, anyAlert.getStatus(), "Alert should be in firing status");
        assertNotNull(anyAlert.getLabels(), "Alert should have labels");
        assertEquals(CommonConstants.ALERT_SEVERITY_CRITICAL, anyAlert.getLabels().get(CommonConstants.LABEL_ALERT_SEVERITY), "Alert should have critical severity");
        assertTrue(anyAlert.getTriggerTimes() >= 1, "Alert should indicate aggregated trigger times");
    }

    /**
     * Setup test alert definitions for periodic log processing
     */
    private void setupTestAlertDefines() {
        // group
        errorCountAlertByGroup = AlertDefine.builder()
                .id(10L)
                .name("periodic_error_count_alert_group")
                .type(CommonConstants.LOG_ALERT_THRESHOLD_TYPE_PERIODIC)
                .expr("SELECT COUNT(*) as error_count FROM hertzbeat_logs WHERE time_unix_nano > NOW() - INTERVAL '10 minute'")
                .period(10) // Faster schedule for tests
                .template("High error count detected: {{ error_count }} errors in last period")
                .datasource("sql")
                .enable(true)
                .build();

        Map<String, String> errorLabelsByGroup = new HashMap<>();
        errorLabelsByGroup.put(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL);
        errorLabelsByGroup.put(CommonConstants.ALERT_MODE_LABEL, CommonConstants.ALERT_MODE_GROUP);
        errorLabelsByGroup.put("type", "error_count");
        errorCountAlertByGroup.setLabels(errorLabelsByGroup);

        // individual
        errorCountAlertByIndividual = AlertDefine.builder()
                .id(11L)
                .name("periodic_error_count_alert_individual")
                .type(CommonConstants.LOG_ALERT_THRESHOLD_TYPE_PERIODIC)
                .expr("SELECT COUNT(*) as error_count, severity_text FROM hertzbeat_logs "
                        + "WHERE severity_text = 'ERROR' AND time_unix_nano > NOW() - INTERVAL '5 minute' GROUP BY severity_text HAVING COUNT(*) > 2")
                .period(10) // Faster schedule for tests
                .template("High error count detected: {{ error_count }} errors in last period")
                .datasource("sql")
                .enable(true)
                .build();

        Map<String, String> errorLabelsByIndividual = new HashMap<>();
        errorLabelsByIndividual.put(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL);
        errorLabelsByIndividual.put(CommonConstants.ALERT_MODE_LABEL, CommonConstants.ALERT_MODE_INDIVIDUAL);
        errorLabelsByIndividual.put("type", "error_count");
        errorCountAlertByIndividual.setLabels(errorLabelsByIndividual);
    }
}
