/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.alert.service.impl;

import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_FIRING;
import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_RESOLVED;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dto.PrometheusExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Contract tests for Prometheus server alert ingestion. */
@ExtendWith(MockitoExtension.class)
class PrometheusExternAlertServiceTest {

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @InjectMocks
    private PrometheusExternAlertService externAlertService;

    @Test
    void prometheusZeroTimeKeepsAnAlertFiring() {
        PrometheusExternAlert alert = PrometheusExternAlert.builder()
                .labels(Map.of("alertname", "HighCPUUsage", "instance", "server-1"))
                .annotations(Map.of("summary", "High CPU usage"))
                .startsAt(Instant.parse("2026-01-01T00:00:00Z"))
                .endsAt(Instant.parse("0001-01-01T00:00:00Z"))
                .build();

        externAlertService.addExternAlert(JsonUtil.toJson(List.of(alert)));

        ArgumentCaptor<SingleAlert> captured = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(captured.capture());
        assertEquals(ALERT_STATUS_FIRING, captured.getValue().getStatus());
        assertNull(captured.getValue().getEndAt());
        assertNotNull(captured.getValue().getActiveAt());
    }

    @Test
    void pastEndTimeResolvesAnAlert() {
        Instant endsAt = Instant.parse("2000-01-01T00:00:00Z");
        PrometheusExternAlert alert = PrometheusExternAlert.builder()
                .labels(Map.of("alertname", "RecoveredService", "instance", "server-1"))
                .annotations(Map.of("summary", "Service recovered"))
                .startsAt(Instant.parse("1999-12-31T23:00:00Z"))
                .endsAt(endsAt)
                .build();

        externAlertService.addExternAlert(JsonUtil.toJson(List.of(alert)));

        ArgumentCaptor<SingleAlert> captured = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(captured.capture());
        assertEquals(ALERT_STATUS_RESOLVED, captured.getValue().getStatus());
        assertEquals(endsAt.toEpochMilli(), captured.getValue().getEndAt());
        assertNull(captured.getValue().getActiveAt());
    }
}
