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

package org.apache.hertzbeat.alert.calculate.periodic;

import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_FIRING;
import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_PENDING;
import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_RESOLVED;
import static org.apache.hertzbeat.common.constants.CommonConstants.LABEL_ALERT_NAME;
import static org.apache.hertzbeat.common.constants.CommonConstants.LABEL_DEFINE_ID;
import static org.apache.hertzbeat.common.constants.CommonConstants.TRACE_ALERT_THRESHOLD_TYPE_PERIODIC;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.calculate.AlarmCacheManager;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests for trace-derived periodic APM alert calculation.
 */
@ExtendWith(MockitoExtension.class)
class TracePeriodicAlertCalculatorTest {

    private static final String EXPR = "SELECT service_name, operation, span_kind, 0.2 AS __value__ "
            + "FROM hertzbeat_apm_red_1m";

    @Mock
    private DataSourceService dataSourceService;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @Mock
    private AlarmCacheManager alarmCacheManager;

    @InjectMocks
    private TracePeriodicAlertCalculator calculator;

    private AlertDefine rule;

    @BeforeEach
    void setUp() {
        rule = AlertDefine.builder()
                .id(42L)
                .name("apm_error_rate")
                .type(TRACE_ALERT_THRESHOLD_TYPE_PERIODIC)
                .datasource("sql")
                .expr(EXPR)
                .times(1)
                .labels(Map.of("team", "checkout", "priority", "P1"))
                .annotations(Map.of("summary", "${service_name} ${operation} value ${__value__}"))
                .template("Trace RED alert ${service_name} ${operation}: ${__value__}")
                .enable(true)
                .period(300)
                .build();
    }

    @Test
    void breachRowFiresAlertWithTraceLabelsAndTemplateContext() {
        when(dataSourceService.query("sql", EXPR, TRACE_ALERT_THRESHOLD_TYPE_PERIODIC))
                .thenReturn(List.of(traceBreachRow()));
        when(alarmCacheManager.getPending(eq(rule.getId()), anyString())).thenReturn(null);
        when(alarmCacheManager.getFiring(eq(rule.getId()), anyString())).thenReturn(null);

        calculator.calculate(rule);

        ArgumentCaptor<SingleAlert> alertCaptor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCacheManager).putFiring(eq(rule.getId()), anyString(), alertCaptor.capture());
        verify(alarmCommonReduce).reduceAndSendAlarm(alertCaptor.getValue().clone());

        SingleAlert alert = alertCaptor.getValue();
        assertAll(
                () -> assertEquals(ALERT_STATUS_FIRING, alert.getStatus()),
                () -> assertEquals("Trace RED alert checkout GET /checkout: 0.2", alert.getContent()),
                () -> assertEquals("42", alert.getLabels().get(LABEL_DEFINE_ID)),
                () -> assertEquals("apm_error_rate", alert.getLabels().get(LABEL_ALERT_NAME)),
                () -> assertEquals("checkout", alert.getLabels().get("team")),
                () -> assertEquals("checkout", alert.getLabels().get("service_name")),
                () -> assertEquals("GET /checkout", alert.getLabels().get("operation")),
                () -> assertEquals("SPAN_KIND_SERVER", alert.getLabels().get("span_kind")),
                () -> assertFalse(alert.getLabels().containsKey("__value__")),
                () -> assertFalse(alert.getLabels().containsKey("__timestamp__")),
                () -> assertEquals("checkout GET /checkout value 0.2", alert.getAnnotations().get("summary"))
        );
    }

    @Test
    void timesGreaterThanOneRequiresConsecutiveBreachesBeforeFiring() {
        rule.setTimes(2);
        SingleAlert pending = SingleAlert.builder()
                .status(ALERT_STATUS_PENDING)
                .triggerTimes(1)
                .labels(Map.of(LABEL_DEFINE_ID, "42", LABEL_ALERT_NAME, "apm_error_rate"))
                .startAt(System.currentTimeMillis() - 1_000)
                .activeAt(System.currentTimeMillis() - 1_000)
                .build();
        when(dataSourceService.query("sql", EXPR, TRACE_ALERT_THRESHOLD_TYPE_PERIODIC))
                .thenReturn(List.of(traceBreachRow()));
        when(alarmCacheManager.getPending(eq(rule.getId()), anyString())).thenReturn(null, pending);
        when(alarmCacheManager.getFiring(eq(rule.getId()), anyString())).thenReturn(null);

        calculator.calculate(rule);
        verify(alarmCacheManager).putPending(eq(rule.getId()), anyString(), org.mockito.ArgumentMatchers.any());
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(org.mockito.ArgumentMatchers.any());

        calculator.calculate(rule);
        verify(alarmCacheManager).removePending(eq(rule.getId()), anyString());
        verify(alarmCacheManager).putFiring(eq(rule.getId()), anyString(), eq(pending));
        verify(alarmCommonReduce).reduceAndSendAlarm(org.mockito.ArgumentMatchers.any());
        assertEquals(ALERT_STATUS_FIRING, pending.getStatus());
        assertEquals(2, pending.getTriggerTimes());
    }

    @Test
    void emptyResultRecoversAllCachedAlertsForDefine() {
        SingleAlert firing = cachedAlert(ALERT_STATUS_FIRING);
        SingleAlert pending = cachedAlert(ALERT_STATUS_PENDING);
        when(dataSourceService.query("sql", EXPR, TRACE_ALERT_THRESHOLD_TYPE_PERIODIC))
                .thenReturn(List.of());
        when(alarmCacheManager.getFiringAlerts(rule.getId())).thenReturn(Map.of("firing-fp", firing));
        when(alarmCacheManager.getPendingAlerts(rule.getId())).thenReturn(Map.of("pending-fp", pending));
        when(alarmCacheManager.removeFiring(rule.getId(), "firing-fp")).thenReturn(firing);

        calculator.calculate(rule);

        ArgumentCaptor<SingleAlert> alertCaptor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCacheManager).removeFiring(rule.getId(), "firing-fp");
        verify(alarmCacheManager).removePending(rule.getId(), "pending-fp");
        verify(alarmCommonReduce).reduceAndSendAlarm(alertCaptor.capture());
        assertEquals(ALERT_STATUS_RESOLVED, alertCaptor.getValue().getStatus());
        assertNotNull(alertCaptor.getValue().getEndAt());
    }

    @Test
    void unmatchedCachedFingerprintsAreRecoveredWhenOtherGroupsStillBreach() {
        SingleAlert staleFiring = cachedAlert(ALERT_STATUS_FIRING);
        when(dataSourceService.query("sql", EXPR, TRACE_ALERT_THRESHOLD_TYPE_PERIODIC))
                .thenReturn(List.of(traceBreachRow()));
        when(alarmCacheManager.getPending(eq(rule.getId()), anyString())).thenReturn(null);
        when(alarmCacheManager.getFiring(eq(rule.getId()), anyString())).thenReturn(null);
        when(alarmCacheManager.getFiringAlerts(rule.getId())).thenReturn(Map.of("stale-fp", staleFiring));
        when(alarmCacheManager.removeFiring(rule.getId(), "stale-fp")).thenReturn(staleFiring);

        calculator.calculate(rule);

        verify(alarmCacheManager).removeFiring(rule.getId(), "stale-fp");
    }

    @Test
    void queryFailureDoesNotRecoverOrTriggerAlerts() {
        when(dataSourceService.query("sql", EXPR, TRACE_ALERT_THRESHOLD_TYPE_PERIODIC))
                .thenThrow(new RuntimeException("greptime unavailable"));

        calculator.calculate(rule);

        verifyNoInteractions(alarmCacheManager);
        verifyNoInteractions(alarmCommonReduce);
    }

    @Test
    void missingValueColumnIsEvaluationFailureWithoutRecovery() {
        when(dataSourceService.query("sql", EXPR, TRACE_ALERT_THRESHOLD_TYPE_PERIODIC))
                .thenReturn(List.of(Map.of("service_name", "checkout")));

        calculator.calculate(rule);

        verifyNoInteractions(alarmCacheManager);
        verifyNoInteractions(alarmCommonReduce);
    }

    private Map<String, Object> traceBreachRow() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("service_name", "checkout");
        row.put("operation", "GET /checkout");
        row.put("span_kind", "SPAN_KIND_SERVER");
        row.put("workspace_id", "workspace-a");
        row.put("entity_id", "entity-a");
        row.put("__value__", 0.2D);
        row.put("__timestamp__", 1_725_000_000_000L);
        row.put("calls_total", 100L);
        return row;
    }

    private SingleAlert cachedAlert(String status) {
        return SingleAlert.builder()
                .status(status)
                .triggerTimes(1)
                .labels(Map.of(LABEL_DEFINE_ID, "42", LABEL_ALERT_NAME, "apm_error_rate",
                        "service_name", "checkout"))
                .startAt(System.currentTimeMillis() - 60_000)
                .activeAt(System.currentTimeMillis() - 30_000)
                .build();
    }
}
