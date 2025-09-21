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
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.boot.test.web.server.LocalServerPort;
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
 * E2E tests for real-time log alert processing.
 */
@SpringBootTest(classes = org.apache.hertzbeat.manager.Manager.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Slf4j
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class LogRealTimeAlertE2eTest {

    private static final String VECTOR_IMAGE = "timberio/vector:latest-alpine";
    private static final int VECTOR_PORT = 8686;
    private static final String VECTOR_CONFIG_PATH = "/etc/vector/vector.yml";
    private static final String ENV_HERTZBEAT_PORT = "HERTZBEAT_PORT";
    private static final Duration CONTAINER_STARTUP_TIMEOUT = Duration.ofSeconds(120);

    @LocalServerPort
    private int port;

    private final List<SingleAlert> capturedAlerts = new ArrayList<>();
    private final ArrayList<List<SingleAlert>> capturedGroupAlerts = new ArrayList<>();

    @SpyBean
    private AlarmCommonReduce alarmCommonReduce;

    static GenericContainer<?> vector;

    @BeforeAll
    void setUpAll() {
        // Setup test alert definitions
        setupTestAlertDefines();
        
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
    void testRealTimeLogAlertWithIndividualAlert() {
        doAnswer(invocation -> {
            SingleAlert alert = invocation.getArgument(0);
            capturedAlerts.add(alert);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarm(any(SingleAlert.class));
        // Clear any existing captured alerts
        capturedAlerts.clear();

        // Wait for real alert to be generated through AlarmCommonReduce
        await().atMost(Duration.ofSeconds(60))
                .pollInterval(Duration.ofSeconds(2))
                .untilAsserted(() -> assertFalse(capturedAlerts.isEmpty(),
                        "Should have generated at least one alert for error logs"));

        // Verify alert properties
        SingleAlert firstAlert = capturedAlerts.get(0);
        assertNotNull(firstAlert, "First alert should not be null");
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, firstAlert.getStatus(), "Alert should be in firing status");
        assertNotNull(firstAlert.getLabels(), "Alert should have labels");
        assertTrue(firstAlert.getLabels().containsKey(CommonConstants.LABEL_ALERT_SEVERITY), "Alert should have severity label");
        assertEquals(CommonConstants.ALERT_SEVERITY_CRITICAL, firstAlert.getLabels().get(CommonConstants.LABEL_ALERT_SEVERITY), "Alert should have critical severity");
    }

    @Test
    void testRealTimeLogAlertWithGroupAlert() {
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<SingleAlert> alerts = invocation.getArgument(1);
            capturedGroupAlerts.add(alerts);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarmGroup(anyMap(), anyList());

        // Clear any existing captured alerts
        capturedGroupAlerts.clear();

        // Wait for group alert to be generated via AlarmCommonReduce
        await().atMost(Duration.ofSeconds(60))
                .pollInterval(Duration.ofSeconds(3))
                .untilAsserted(() -> assertFalse(capturedGroupAlerts.isEmpty(),
                        "Should have generated high frequency warning group alert"));

        List<SingleAlert> groupAlerts = capturedGroupAlerts.get(0);
        assertNotNull(groupAlerts, "Group alerts should not be null");
        assertTrue(groupAlerts.size() >= 2, "Group should contain at least 5 alerts");

        SingleAlert anyAlert = groupAlerts.get(0);
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, anyAlert.getStatus(), "Alert should be in firing status");
        assertNotNull(anyAlert.getLabels(), "Alert should have labels");
        assertEquals(CommonConstants.ALERT_SEVERITY_WARNING, anyAlert.getLabels().get(CommonConstants.LABEL_ALERT_SEVERITY), "Alert should have warning severity");
        assertTrue(anyAlert.getTriggerTimes() >= 2, "Alert should indicate high frequency trigger");
    }

    /**
     * Setup test alert definitions for real-time log processing
     */
    private void setupTestAlertDefines() {
        List<AlertDefine> alertDefines = new ArrayList<>();

        // Create error log alert definition
        AlertDefine errorLogAlert = AlertDefine.builder()
                .id(1L)
                .name("error_log_alert")
                .type(CommonConstants.LOG_ALERT_THRESHOLD_TYPE_REALTIME)
                .expr("log.severityText == 'ERROR'")
                .period(10) // 10 seconds window
                .times(1)   // Trigger on first occurrence
                .template("Error detected: {{ body }}")
                .enable(true)
                .build();

        Map<String, String> errorLabels = new HashMap<>();
        errorLabels.put(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL);
        errorLabels.put(CommonConstants.ALERT_MODE_LABEL, CommonConstants.ALERT_MODE_INDIVIDUAL);
        errorLogAlert.setLabels(errorLabels);

        alertDefines.add(errorLogAlert);

        // Create high frequency warning alert definition
        AlertDefine highFrequencyWarning = AlertDefine.builder()
                .id(2L)
                .name("high_frequency_warning")
                .type(CommonConstants.LOG_ALERT_THRESHOLD_TYPE_REALTIME)
                .expr("log.severityText == 'ERROR'")
                .period(10)
                .times(2)
                .template("High frequency warnings detected: {{ __rows__ }} warnings in 30 seconds")
                .enable(true)
                .build();

        Map<String, String> warningLabels = new HashMap<>();
        warningLabels.put(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_WARNING);
        warningLabels.put(CommonConstants.ALERT_MODE_LABEL, CommonConstants.ALERT_MODE_GROUP);
        highFrequencyWarning.setLabels(warningLabels);

        alertDefines.add(highFrequencyWarning);

        // Set alert definitions in cache
        CacheFactory.setLogAlertDefineCache(alertDefines);
    }

}
