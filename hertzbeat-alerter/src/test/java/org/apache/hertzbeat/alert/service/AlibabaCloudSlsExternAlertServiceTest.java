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

package org.apache.hertzbeat.alert.service;


import org.apache.hertzbeat.alert.dto.AlibabaCloudSlsExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.impl.AlibabaCloudSlsExternAlertService;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * unit test for {@link AlibabaCloudSlsExternAlertServiceTest }
 */
@ExtendWith(MockitoExtension.class)
public class AlibabaCloudSlsExternAlertServiceTest {

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @InjectMocks
    private AlibabaCloudSlsExternAlertService externAlertService;

    @Test
    void testAddExternAlertWithInvalidContent() {
        String invalidContent = "invalid json";
        externAlertService.addExternAlert(invalidContent);
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testAddExternAlert() {
        String source = externAlertService.supportSource();
        assertEquals("alibabacloud-sls", source);

        AlibabaCloudSlsExternAlert externAlert = new AlibabaCloudSlsExternAlert();
        externAlert.setAlertName("Test SLS alert");
        externAlert.setFireTime((int) Instant.now().getEpochSecond());
        externAlert.setAlertTime((int) Instant.now().getEpochSecond());
        externAlert.setRegion("cn-hangzhou");
        externAlert.setProject("project");
        externAlert.setStatus("firing");
        externAlert.setSeverity(AlibabaCloudSlsExternAlert.Severity.HIGH.getStatus());

        Map<String, String> labels = new HashMap<>();
        labels.put("labels-k", "labels-v");
        externAlert.setLabels(labels);

        Map<String, String> annotations = new HashMap<>();
        annotations.put("annotations-k", "annotations-v");
        externAlert.setAnnotations(annotations);

        externAlertService.addExternAlert(JsonUtil.toJson(externAlert));

        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testAddExternAlertWithSigninUrl() {
        AlibabaCloudSlsExternAlert alert = new AlibabaCloudSlsExternAlert();
        alert.setAlertName("Test Alert");
        alert.setFireTime((int) Instant.now().getEpochSecond());
        alert.setAlertTime((int) Instant.now().getEpochSecond());
        alert.setRegion("cn-hangzhou");
        alert.setProject("test-project");
        alert.setStatus("firing");
        alert.setSeverity(AlibabaCloudSlsExternAlert.Severity.HIGH.getStatus());
        alert.setSigninUrl("https://example.com");
        externAlertService.addExternAlert(JsonUtil.toJson(alert));
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testAddExternAlertWithDifferentSeverityLevels() {
        for (AlibabaCloudSlsExternAlert.Severity severity : AlibabaCloudSlsExternAlert.Severity.values()) {
            AlibabaCloudSlsExternAlert alert = new AlibabaCloudSlsExternAlert();
            alert.setAlertName("Test Alert");
            alert.setFireTime((int) Instant.now().getEpochSecond());
            alert.setAlertTime((int) Instant.now().getEpochSecond());
            alert.setRegion("cn-hangzhou");
            alert.setProject("test-project");
            alert.setStatus("firing");
            alert.setSeverity(severity.getStatus());
            externAlertService.addExternAlert(JsonUtil.toJson(alert));
        }
        verify(alarmCommonReduce, times(AlibabaCloudSlsExternAlert.Severity.values().length))
                .reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testAddExternAlertWithEmptyLabelsAndAnnotations() {
        AlibabaCloudSlsExternAlert alert = new AlibabaCloudSlsExternAlert();
        alert.setAlertName("Test Alert");
        alert.setFireTime((int) Instant.now().getEpochSecond());
        alert.setAlertTime((int) Instant.now().getEpochSecond());
        alert.setRegion("cn-hangzhou");
        alert.setProject("test-project");
        alert.setStatus("firing");
        alert.setSeverity(AlibabaCloudSlsExternAlert.Severity.HIGH.getStatus());
        alert.setLabels(new HashMap<>());
        alert.setAnnotations(new HashMap<>());
        externAlertService.addExternAlert(JsonUtil.toJson(alert));
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testAddExternAlertWithInvalidSeverity() {
        AlibabaCloudSlsExternAlert alert = new AlibabaCloudSlsExternAlert();
        alert.setAlertName("Test Alert");
        alert.setFireTime((int) Instant.now().getEpochSecond());
        alert.setAlertTime((int) Instant.now().getEpochSecond());
        alert.setRegion("cn-hangzhou");
        alert.setProject("test-project");
        alert.setStatus("firing");
        alert.setSeverity(-99);
        externAlertService.addExternAlert(JsonUtil.toJson(alert));
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));
    }

}