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

package org.apache.hertzbeat.alert.reduce;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.alert.notice.AlertNoticeDispatch;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test for {@link AlarmSilenceReduce}
 */
class AlarmSilenceReduceTest {

    @Mock
    private AlertSilenceDao alertSilenceDao;
    
    @Mock
    private AlertNoticeDispatch alertNoticeDispatch;

    private AlarmSilenceReduce alarmSilenceReduce;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        CacheFactory.clearAlertSilenceCache();
        alarmSilenceReduce = new AlarmSilenceReduce(alertSilenceDao, alertNoticeDispatch);
    }

    @Test
    void whenNoSilenceRules_shouldForwardAlert() {
        when(alertSilenceDao.findAlertSilencesByEnableTrue()).thenReturn(Collections.emptyList());

        GroupAlert alert = createGroupAlert("firing", createLabels("service", "web"));
        alarmSilenceReduce.silenceAlarm(alert);

        verify(alertNoticeDispatch).dispatchAlarm(alert);
    }

    @Test
    void whenMatchingSilenceRule_shouldNotForwardAlert() {

        // Create silence rule
        AlertSilence silenceRule = AlertSilence.builder()
                .enable(true)
                .matchAll(false)
                .type((byte) 0) // once
                .labels(createLabels("service", "web"))
                .periodStart(LocalDateTime.now().minusHours(1).atZone(ZoneId.systemDefault()))
                .periodEnd(LocalDateTime.now().plusHours(1).atZone(ZoneId.systemDefault()))
                .times(0)
                .build();

        when(alertSilenceDao.findAlertSilencesByEnableTrue()).thenReturn(Collections.singletonList(silenceRule));
        when(alertSilenceDao.save(any(AlertSilence.class))).thenReturn(silenceRule);
        
        GroupAlert alert = createGroupAlert("firing", createLabels("service", "web"));
        
        alarmSilenceReduce.silenceAlarm(alert);
        
        verify(alertNoticeDispatch, never()).dispatchAlarm(alert);
        verify(alertSilenceDao).save(silenceRule);
    }

    @Test
    void whenMatchingCyclicSilenceRuleShouldNotForwardAlert() {
        LocalDateTime now = LocalDateTime.now();
        // Create cyclic silence rule
        AlertSilence silenceRule = AlertSilence.builder()
                .enable(true)
                .matchAll(false)
                .type((byte) 1) // cyclic
                .labels(createLabels("service", "web"))
                .periodStart(now.minusMinutes(30).atZone(ZoneId.systemDefault())) 
                .periodEnd(now.plusMinutes(30).atZone(ZoneId.systemDefault())) 
                .days(Collections.singletonList((byte) now.getDayOfWeek().getValue()))
                .times(0)
                .build();

        when(alertSilenceDao.findAlertSilencesByEnableTrue()).thenReturn(Collections.singletonList(silenceRule));
        when(alertSilenceDao.save(any(AlertSilence.class))).thenReturn(silenceRule);

        GroupAlert alert = createGroupAlert("firing", createLabels("service", "web"));
        
        alarmSilenceReduce.silenceAlarm(alert);
        
        verify(alertNoticeDispatch, never()).dispatchAlarm(alert);
        verify(alertSilenceDao).save(silenceRule);
    }

    @Test
    void whenSilenceRuleExpired_shouldForwardAlert() {
        AlertSilence silenceRule = AlertSilence.builder()
                .enable(true)
                .matchAll(false)
                .type((byte) 0)
                .labels(createLabels("service", "web"))
                .periodStart(LocalDateTime.now().minusHours(2).atZone(ZoneId.systemDefault()))
                .periodEnd(LocalDateTime.now().minusHours(1).atZone(ZoneId.systemDefault()))
                .times(0)
                .build();

        when(alertSilenceDao.findAlertSilencesByEnableTrue()).thenReturn(Collections.singletonList(silenceRule));
        
        GroupAlert alert = createGroupAlert("firing", createLabels("service", "web"));
        
        alarmSilenceReduce.silenceAlarm(alert);
        
        verify(alertNoticeDispatch).dispatchAlarm(alert);
        verify(alertSilenceDao, never()).save(any());
    }

    private GroupAlert createGroupAlert(String status, Map<String, String> labels) {
        return GroupAlert.builder()
                .status(status)
                .groupLabels(labels)
                .commonLabels(labels)
                .build();
    }

    private Map<String, String> createLabels(String... keyValues) {
        Map<String, String> labels = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            labels.put(keyValues[i], keyValues[i + 1]);
        }
        return labels;
    }
}
