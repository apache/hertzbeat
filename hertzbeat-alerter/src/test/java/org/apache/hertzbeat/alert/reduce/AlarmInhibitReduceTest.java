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

package org.apache.hertzbeat.alert.reduce;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test for AlarmInhibitReduce
 */
class AlarmInhibitReduceTest {

    @Mock
    private AlertInhibitDao alertInhibitDao;
    
    @Mock
    private AlarmSilenceReduce alarmSilenceReduce;

    private AlarmInhibitReduce alarmInhibitReduce;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(alertInhibitDao.findAlertInhibitsByEnableIsTrue())
            .thenReturn(Collections.emptyList());
        alarmInhibitReduce = new AlarmInhibitReduce(alarmSilenceReduce, alertInhibitDao);
    }

    @Test
    void whenNoInhibitRules_shouldForwardAlert() {
        GroupAlert alert = createGroupAlert("firing", createLabels("severity", "warning"));
        
        alarmInhibitReduce.inhibitAlarm(alert);
        
        verify(alarmSilenceReduce).silenceAlarm(alert);
    }

    @Test
    void whenSourceAlertMatches_shouldInhibitTargetAlert() {
        // Create inhibit rule
        AlertInhibit rule = AlertInhibit.builder()
                .id(1L)
                .enable(true)
                .sourceLabels(createLabels("severity", "critical"))
                .targetLabels(createLabels("severity", "warning"))
                .equalLabels(Arrays.asList("instance"))
                .build();
                
        alarmInhibitReduce.refreshInhibitRules(Collections.singletonList(rule));
        
        // Create and process source alert
        GroupAlert sourceAlert = createGroupAlert("firing", 
            createLabels("severity", "critical", "instance", "host1"));
        alarmInhibitReduce.inhibitAlarm(sourceAlert);
        
        // Create and process target alert
        GroupAlert targetAlert = createGroupAlert("firing",
            createLabels("severity", "warning", "instance", "host1"));
        alarmInhibitReduce.inhibitAlarm(targetAlert);
        
        // Target alert should be inhibited
        verify(alarmSilenceReduce).silenceAlarm(sourceAlert);
        verify(alarmSilenceReduce, never()).silenceAlarm(targetAlert);
    }

    @Test
    void whenSourceAlertDoesNotMatch_shouldNotInhibitTargetAlert() {
        AlertInhibit rule = AlertInhibit.builder()
                .id(1L)
                .enable(true)
                .sourceLabels(createLabels("severity", "critical"))
                .targetLabels(createLabels("severity", "warning"))
                .equalLabels(Arrays.asList("instance"))
                .build();
                
        alarmInhibitReduce.refreshInhibitRules(Collections.singletonList(rule));
        
        // Create source alert with different instance
        GroupAlert sourceAlert = createGroupAlert("firing",
            createLabels("severity", "critical", "instance", "host1"));
        alarmInhibitReduce.inhibitAlarm(sourceAlert);
        
        // Create target alert with different instance
        GroupAlert targetAlert = createGroupAlert("firing",
            createLabels("severity", "warning", "instance", "host2"));
        alarmInhibitReduce.inhibitAlarm(targetAlert);
        
        // Both alerts should be forwarded
        verify(alarmSilenceReduce).silenceAlarm(sourceAlert);
        verify(alarmSilenceReduce).silenceAlarm(targetAlert);
    }

    @Test
    void whenResolvedAlert_shouldNeverBeInhibited() {
        AlertInhibit rule = AlertInhibit.builder()
                .id(1L)
                .enable(true)
                .sourceLabels(createLabels("severity", "critical"))
                .targetLabels(createLabels("severity", "warning"))
                .build();
                
        alarmInhibitReduce.refreshInhibitRules(Collections.singletonList(rule));
        
        GroupAlert sourceAlert = createGroupAlert("firing",
            createLabels("severity", "critical"));
        GroupAlert resolvedAlert = createGroupAlert("resolved",
            createLabels("severity", "warning"));
            
        alarmInhibitReduce.inhibitAlarm(sourceAlert);
        alarmInhibitReduce.inhibitAlarm(resolvedAlert);
        
        verify(alarmSilenceReduce).silenceAlarm(sourceAlert);
        verify(alarmSilenceReduce).silenceAlarm(resolvedAlert);
    }

    private GroupAlert createGroupAlert(String status, Map<String, String> labels) {
        return GroupAlert.builder()
                .status(status)
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
