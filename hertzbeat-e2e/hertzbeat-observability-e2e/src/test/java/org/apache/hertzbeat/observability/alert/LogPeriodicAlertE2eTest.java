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

package org.apache.hertzbeat.observability.alert;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.calculate.periodic.PeriodicAlertRuleScheduler;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.observability.fixture.GreptimeE2eSupport;
import org.apache.hertzbeat.observability.fixture.VectorE2eContainer;
import org.apache.hertzbeat.startup.TrustedStartup;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.Testcontainers;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
@TrustedStartup
@TestPropertySource(properties = {
        "warehouse.store.duckdb.enabled=false"
})
@Slf4j
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class LogPeriodicAlertE2eTest extends GreptimeE2eSupport {

    private static final Duration CONTAINER_STARTUP_TIMEOUT = Duration.ofSeconds(120);

    @LocalServerPort
    private int port;

    @Autowired
    PeriodicAlertRuleScheduler periodicAlertRuleScheduler;

    AlertDefine errorCountAlertByGroup;
    AlertDefine errorCountAlertByIndividual;

    @MockitoSpyBean
    private AlarmCommonReduce alarmCommonReduce;

    static GenericContainer<?> vector;

    @BeforeAll
    void setUpAll() throws InterruptedException {
        initializeAdministrator();
        // Setup test alert definitions
        setupTestAlertDefines();
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
                .untilAsserted(() -> {
                    Optional<SingleAlert> matchedAlert = capturedGroupAlerts.stream()
                            .flatMap(List::stream)
                            .filter(alert -> alert.getLabels() != null)
                            .filter(alert -> String.valueOf(errorCountAlertByGroup.getId())
                                    .equals(alert.getLabels().get(CommonConstants.LABEL_DEFINE_ID)))
                            .findFirst();

                    assertTrue(matchedAlert.isPresent(), "Should have captured group alert from target alert define");
                    SingleAlert anyAlert = matchedAlert.get();
                    assertEquals(CommonConstants.ALERT_STATUS_FIRING, anyAlert.getStatus(), "Alert should be in firing status");
                    assertEquals(CommonConstants.ALERT_SEVERITY_CRITICAL,
                            anyAlert.getLabels().get(CommonConstants.LABEL_ALERT_SEVERITY),
                            "Alert should have critical severity");
                    assertTrue(anyAlert.getTriggerTimes() >= 1, "Alert should indicate aggregated trigger times");
                });
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
                .expr("SELECT COUNT(*) as error_count FROM hertzbeat_logs "
                        + "WHERE timestamp > NOW() - INTERVAL '10 minutes'")
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
                        + "WHERE severity_text = 'ERROR' AND timestamp > NOW() - INTERVAL '5 minutes' "
                        + "GROUP BY severity_text HAVING COUNT(*) > 2")
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
