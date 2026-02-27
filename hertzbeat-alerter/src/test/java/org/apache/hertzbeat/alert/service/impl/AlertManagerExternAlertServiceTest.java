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

package org.apache.hertzbeat.alert.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.hertzbeat.alert.dto.AlertManagerExternAlert;
import org.apache.hertzbeat.alert.dto.PrometheusExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * unit test for {@link AlertManagerExternAlertService}
 */
@ExtendWith(MockitoExtension.class)
public class AlertManagerExternAlertServiceTest {

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @InjectMocks
    private AlertManagerExternAlertService externAlertService;

    @BeforeEach
    void setUp() {
        assertEquals("alertmanager", externAlertService.supportSource());
    }

    @Test
    void testAddExternAlertWithEndsAtZeroEpochTime() {
        PrometheusExternAlert prometheusAlert = PrometheusExternAlert.builder()
            .labels(Map.of(
                "alertname", "HighCPUUsage",
                "instance", "server1",
                "job", "node_exporter"
            ))
            .annotations(Map.of(
                "summary", "High CPU usage detected",
                "description", "CPU usage is above 80%"
            ))
            .startsAt(Instant.now())
            .endsAt(Instant.EPOCH) // 0001-01-01T00:00:00Z, epoch second = 0
            .generatorURL("http://prometheus:9090/graph")
            .build();

        AlertManagerExternAlert alertManagerAlert = AlertManagerExternAlert.builder()
            .groupKey("test-group-key")
            .externalURL("http://alertmanager:9093")
            .version("4")
            .status("firing")
            .groupLabels(Map.of("alertname", "HighCPUUsage"))
            .commonLabels(Map.of("monitor", "prometheus"))
            .commonAnnotations(Map.of("summary", "Group summary"))
            .alerts(List.of(prometheusAlert))
            .build();

        final SingleAlert[] capturedAlert = new SingleAlert[1];
        doAnswer(invocation -> {
            capturedAlert[0] = invocation.getArgument(0);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarm(any(SingleAlert.class));

        externAlertService.addExternAlert(JsonUtil.toJson(alertManagerAlert));

        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));

        assertNotNull(capturedAlert[0]);
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, capturedAlert[0].getStatus());
        assertNull(capturedAlert[0].getEndAt(), "endAt should be null for firing alert with endsAt epoch=0");
        assertNotNull(capturedAlert[0].getActiveAt(), "activeAt should be set for firing alert");
        assertNotNull(capturedAlert[0].getStartAt(), "startAt should be set");
        assertEquals("CPU usage is above 80%", capturedAlert[0].getContent());

        assertEquals("alertmanager", capturedAlert[0].getLabels().get("__source__"));
        assertEquals("HighCPUUsage", capturedAlert[0].getLabels().get("alertname"));
        assertEquals("server1", capturedAlert[0].getLabels().get("instance"));
    }

    @Test
    void testAddExternAlertWithEndsAtInFuture() {
        PrometheusExternAlert prometheusAlert = PrometheusExternAlert.builder()
            .labels(Map.of(
                "alertname", "HighMemoryUsage",
                "instance", "server2"
            ))
            .annotations(Map.of(
                "summary", "High memory usage"
            ))
            .startsAt(Instant.now())
            .endsAt(Instant.now().plusSeconds(3600)) // 1 hour in the future
            .build();

        AlertManagerExternAlert alertManagerAlert = AlertManagerExternAlert.builder()
            .groupKey("test-group-key-2")
            .alerts(List.of(prometheusAlert))
            .build();

        final SingleAlert[] capturedAlert = new SingleAlert[1];
        doAnswer(invocation -> {
            capturedAlert[0] = invocation.getArgument(0);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarm(any(SingleAlert.class));

        externAlertService.addExternAlert(JsonUtil.toJson(alertManagerAlert));

        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));

        assertNotNull(capturedAlert[0]);
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, capturedAlert[0].getStatus());
        assertNull(capturedAlert[0].getEndAt(), "endAt should be null for firing alert");
    }

    @Test
    void testAddExternAlertWithEndsAtInPast() {
        PrometheusExternAlert prometheusAlert = PrometheusExternAlert.builder()
            .labels(Map.of(
                "alertname", "RecoveredAlert",
                "instance", "server3"
            ))
            .annotations(Map.of(
                "summary", "Alert has been resolved"
            ))
            .startsAt(Instant.now().minusSeconds(7200))
            .endsAt(Instant.now().minusSeconds(3600)) // 1 hour ago (resolved)
            .build();

        AlertManagerExternAlert alertManagerAlert = AlertManagerExternAlert.builder()
            .groupKey("test-group-key-3")
            .alerts(List.of(prometheusAlert))
            .build();

        final SingleAlert[] capturedAlert = new SingleAlert[1];
        doAnswer(invocation -> {
            capturedAlert[0] = invocation.getArgument(0);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarm(any(SingleAlert.class));

        externAlertService.addExternAlert(JsonUtil.toJson(alertManagerAlert));

        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));

        assertNotNull(capturedAlert[0]);
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, capturedAlert[0].getStatus());
        assertNotNull(capturedAlert[0].getEndAt(), "endAt should be set for resolved alert");
        assertNull(capturedAlert[0].getActiveAt(), "activeAt should be null for resolved alert");
    }

    @Test
    void testAddExternAlertWithInvalidContent() {
        String invalidContent = "invalid json content";
        externAlertService.addExternAlert(invalidContent);
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testAddExternAlertWithEmptyAlerts() {
        AlertManagerExternAlert alertManagerAlert = AlertManagerExternAlert.builder()
            .groupKey("test-group-key")
            .alerts(List.of()) // Empty alerts list
            .build();
        externAlertService.addExternAlert(JsonUtil.toJson(alertManagerAlert));
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testAddExternAlertWithNullLabels() {
        PrometheusExternAlert prometheusAlert = PrometheusExternAlert.builder()
            .labels(null)
            .annotations(Map.of("summary", "Test alert"))
            .startsAt(Instant.now())
            .endsAt(Instant.EPOCH) // Firing alert
            .build();

        AlertManagerExternAlert alertManagerAlert = AlertManagerExternAlert.builder()
            .groupKey("test-group-key-null-labels")
            .alerts(List.of(prometheusAlert))
            .build();

        final SingleAlert[] capturedAlert = new SingleAlert[1];
        doAnswer(invocation -> {
            capturedAlert[0] = invocation.getArgument(0);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarm(any(SingleAlert.class));

        externAlertService.addExternAlert(JsonUtil.toJson(alertManagerAlert));

        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));

        assertNotNull(capturedAlert[0]);
        assertNotNull(capturedAlert[0].getLabels());
        assertEquals("alertmanager", capturedAlert[0].getLabels().get("__source__"));
    }

    @Test
    void testAddExternAlertWithNullAnnotations() {
        Map<String, String> labels = new HashMap<>();
        labels.put("alertname", "TestAlert");

        PrometheusExternAlert prometheusAlert = PrometheusExternAlert.builder()
            .labels(labels)
            .annotations(null)
            .startsAt(Instant.now())
            .endsAt(Instant.EPOCH)
            .build();

        AlertManagerExternAlert alertManagerAlert = AlertManagerExternAlert.builder()
            .groupKey("test-group-key-null-annotations")
            .alerts(List.of(prometheusAlert))
            .build();

        final SingleAlert[] capturedAlert = new SingleAlert[1];
        doAnswer(invocation -> {
            capturedAlert[0] = invocation.getArgument(0);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarm(any(SingleAlert.class));

        externAlertService.addExternAlert(JsonUtil.toJson(alertManagerAlert));

        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));

        assertNotNull(capturedAlert[0]);
        assertEquals("", capturedAlert[0].getContent());
    }

    @Test
    void testAddExternAlertWithEndsAtNull() {
        PrometheusExternAlert prometheusAlert = PrometheusExternAlert.builder()
            .labels(Map.of("alertname", "NullEndsAtAlert"))
            .annotations(Map.of("summary", "Test alert with null endsAt"))
            .startsAt(Instant.now())
            .endsAt(null)
            .build();

        AlertManagerExternAlert alertManagerAlert = AlertManagerExternAlert.builder()
            .groupKey("test-group-key-null-endsat")
            .alerts(List.of(prometheusAlert))
            .build();

        final SingleAlert[] capturedAlert = new SingleAlert[1];
        doAnswer(invocation -> {
            capturedAlert[0] = invocation.getArgument(0);
            return null;
        }).when(alarmCommonReduce).reduceAndSendAlarm(any(SingleAlert.class));

        externAlertService.addExternAlert(JsonUtil.toJson(alertManagerAlert));

        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));

        assertNotNull(capturedAlert[0]);
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, capturedAlert[0].getStatus());
        assertNull(capturedAlert[0].getEndAt(), "endAt should be null when endsAt is null");
    }
}
