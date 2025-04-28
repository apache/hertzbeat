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

package org.apache.hertzbeat.alert.calculate;

import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link PeriodicAlertCalculator}
 */
@ExtendWith(MockitoExtension.class)
class PeriodicAlertCalculatorTest {

    @Mock
    private DataSourceService dataSourceService;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @Mock
    private AlarmCacheManager alarmCacheManager;

    @InjectMocks
    private PeriodicAlertCalculator periodicAlertCalculator;

    private AlertDefine rule;

    @BeforeEach
    void setUp() {
        rule = AlertDefine.builder()
                .id(1L)
                .name("high_cpu_usage")
                .type("periodic")
                .expr("usage>90")
                .times(1)
                .labels(Map.of("team", "test-team", "priority", "P1"))
                .annotations(Map.of("summary", "High CPU usage detected"))
                .template("High CPU usage (${__value__}%)")
                .datasource("PROMETHEUS")
                .enable(true)
                .period(300)
                .build();
    }

    @Test
    void testTriggerAlertWhenMatchThreshold() {
        reset(alarmCacheManager);
        Map<String, Object> result = new HashMap<>();
        result.put("__value__", 95.0); // Non-null, matched with threshold
        result.put("__timestamp__", System.currentTimeMillis());
        when(dataSourceService.calculate(anyString(), anyString())).thenReturn(List.of(result));
        when(alarmCacheManager.getPending(anyString())).thenReturn(null);
        periodicAlertCalculator.calculate(rule);
        // Verify that putFiring is called
        ArgumentCaptor<String> idCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<SingleAlert> alertCaptor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCacheManager).putFiring(idCaptor.capture(), alertCaptor.capture());
        // Assertion alarm status and content
        SingleAlert alert = alertCaptor.getValue();
        assertAll(() -> assertEquals(CommonConstants.ALERT_STATUS_FIRING, alert.getStatus()),
                () -> assertEquals("High CPU usage (95.0%)", alert.getContent()));
    }

    @Test
    void testNoTriggerAlertWhenNotMatchThreshold() {
        reset(alarmCacheManager);
        Map<String, Object> result = new HashMap<>();
        result.put("__value__", null); // null, not matched with threshold
        result.put("__timestamp__", System.currentTimeMillis());
        when(dataSourceService.calculate(anyString(), anyString())).thenReturn(List.of(result));
        periodicAlertCalculator.calculate(rule);
        verify(alarmCacheManager, times(0)).putFiring(any(), any());
    }

    @Test
    void testResolveFiringAlert() {
        reset(alarmCacheManager);
        Map<String, Object> result = new HashMap<>();
        result.put("__value__", null); // null, not matched with threshold
        result.put("__timestamp__", System.currentTimeMillis());
        SingleAlert pendingAlert = SingleAlert.builder()
                .status(CommonConstants.ALERT_STATUS_FIRING)
                .triggerTimes(2).startAt(System.currentTimeMillis() - 60000)
                .activeAt(System.currentTimeMillis() - 30000)
                .build();
        when(alarmCacheManager.removeFiring(anyString())).thenReturn(pendingAlert);
        when(dataSourceService.calculate(anyString(), anyString())).thenReturn(List.of(result));
        periodicAlertCalculator.calculate(rule);
        ArgumentCaptor<SingleAlert> resolvedCaptor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(resolvedCaptor.capture());
        SingleAlert resolvedAlert = resolvedCaptor.getValue();
        assertAll(() -> assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, resolvedAlert.getStatus()),
                () -> assertNotNull(resolvedAlert.getEndAt()),
                () -> assertTrue(resolvedAlert.getEndAt() > resolvedAlert.getStartAt()));
    }

    @ParameterizedTest
    @NullAndEmptySource
    void testSkipWhenDataSourceResultInvalid(List<Map<String, Object>> results) {
        when(dataSourceService.calculate(anyString(), anyString())).thenReturn(results);
        periodicAlertCalculator.calculate(rule);
        verifyNoInteractions(alarmCacheManager);
    }

    @Test
    void testHandleDisabledRule() {
        rule.setEnable(false);
        periodicAlertCalculator.calculate(rule);
        verifyNoInteractions(dataSourceService);
    }
}
