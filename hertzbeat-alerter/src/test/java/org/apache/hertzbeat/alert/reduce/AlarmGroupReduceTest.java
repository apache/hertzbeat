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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.AlertGroupConvergeDao;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * Test for AlarmGroupReduce
 */
class AlarmGroupReduceTest {

    @Mock
    private AlarmInhibitReduce alarmInhibitReduce;
    
    @Mock
    private AlertGroupConvergeDao alertGroupConvergeDao;
    
    private AlarmGroupReduce alarmGroupReduce;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(alertGroupConvergeDao.findAlertGroupConvergesByEnableIsTrue())
            .thenReturn(Collections.emptyList());
        alarmGroupReduce = new AlarmGroupReduce(alarmInhibitReduce, alertGroupConvergeDao);
    }

    @Test
    void whenNoGroupRules_shouldSendSingleAlert() {
        SingleAlert alert = SingleAlert.builder()
                .fingerprint("fp1")
                .status("firing")
                .labels(createLabels("severity", "critical"))
                .build();
                
        alarmGroupReduce.processGroupAlert(alert);
        
        verify(alarmInhibitReduce).inhibitAlarm(argThat(group -> 
            group.getAlerts().size() == 1 && group.getAlerts().get(0).getFingerprint().equals("fp1")));
    }

    @Test
    void whenMatchingGroupRule_shouldGroup() {
        // Setup group rule
        AlertGroupConverge rule = new AlertGroupConverge();
        rule.setName("test-rule");
        rule.setGroupLabels(Arrays.asList("severity", "instance"));
        when(alertGroupConvergeDao.findAlertGroupConvergesByEnableIsTrue())
            .thenReturn(Collections.singletonList(rule));
        alarmGroupReduce.refreshGroupDefines(Collections.singletonList(rule));
        
        SingleAlert alert = SingleAlert.builder()
                .fingerprint("fp1")
                .status("firing")
                .labels(createLabels("severity", "critical", "instance", "host1"))
                .build();
                
        alarmGroupReduce.processGroupAlert(alert);
        
        // Verify group is created and cached (implicitly tested through internal state)
        verify(alarmInhibitReduce, never()).inhibitAlarm(any());  // Should not send immediately due to group wait
    }

    private Map<String, String> createLabels(String... keyValues) {
        Map<String, String> labels = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            labels.put(keyValues[i], keyValues[i + 1]);
        }
        return labels;
    }
}
