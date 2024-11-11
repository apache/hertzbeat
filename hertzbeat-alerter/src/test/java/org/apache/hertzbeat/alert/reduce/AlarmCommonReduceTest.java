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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.AlertMonitorDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.Tag;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test case for {@link AlarmCommonReduce}
 */

@ExtendWith(MockitoExtension.class)
class AlarmCommonReduceTest {

    @Mock
    private AlarmSilenceReduce alarmSilenceReduce;

    @Mock
    private AlarmConvergeReduce alarmConvergeReduce;

    @Mock
    private CommonDataQueue dataQueue;

    @Mock
    private AlertMonitorDao alertMonitorDao;

    private AlarmCommonReduce alarmCommonReduce;

    private Alert testAlert;

    @BeforeEach
    void setUp() {

        testAlert = Alert.builder().build();
        alarmCommonReduce = new AlarmCommonReduce(
                alarmSilenceReduce,
                alarmConvergeReduce,
                dataQueue,
                alertMonitorDao
        );
    }

    @Test
    void testReduceAndSendAlarmNoMonitorId() {

        when(alarmConvergeReduce.filterConverge(testAlert)).thenReturn(true);
        when(alarmSilenceReduce.filterSilence(testAlert)).thenReturn(true);

        alarmCommonReduce.reduceAndSendAlarm(testAlert);

        verify(dataQueue).sendAlertsData(testAlert);
        verify(alertMonitorDao, never()).findMonitorIdBindTags(anyLong());
    }

    @Test
    void testReduceAndSendAlarmWithMonitorId() {

        Map<String, String> tags = new HashMap<>();
        tags.put(CommonConstants.TAG_MONITOR_ID, "123");
        testAlert.setTags(tags);

        doReturn(Collections.singletonList(
                Tag.builder()
                        .name("newTag")
                        .tagValue("tagValue")
                        .build())
        ).when(alertMonitorDao).findMonitorIdBindTags(123L);
        when(alarmConvergeReduce.filterConverge(testAlert)).thenReturn(true);
        when(alarmSilenceReduce.filterSilence(testAlert)).thenReturn(true);

        alarmCommonReduce.reduceAndSendAlarm(testAlert);

        assertTrue(testAlert.getTags().containsKey("newTag"));
        assertEquals("tagValue", testAlert.getTags().get("newTag"));
        verify(dataQueue).sendAlertsData(testAlert);
    }

    @Test
    void testReduceAndSendAlarmConvergeFilterFail() {

        when(alarmConvergeReduce.filterConverge(testAlert)).thenReturn(false);

        alarmCommonReduce.reduceAndSendAlarm(testAlert);

        verify(dataQueue, never()).sendAlertsData(testAlert);
        verify(alarmSilenceReduce, never()).filterSilence(any(Alert.class));
    }

    @Test
    void testReduceAndSendAlarmSilenceFilterFail() {

        when(alarmConvergeReduce.filterConverge(testAlert)).thenReturn(true);
        when(alarmSilenceReduce.filterSilence(testAlert)).thenReturn(false);

        alarmCommonReduce.reduceAndSendAlarm(testAlert);

        verify(dataQueue, never()).sendAlertsData(testAlert);
    }

}
