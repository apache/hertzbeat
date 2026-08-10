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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import java.time.Instant;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.impl.AlibabaCloudCmsExternAlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit test for {@link AlibabaCloudCmsExternAlertService}.
 */
@ExtendWith(MockitoExtension.class)
class AlibabaCloudCmsExternAlertServiceTest {

    private static final long EVENT_TIME = 1785300000123L;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    private AlibabaCloudCmsExternAlertService externAlertService;

    @BeforeEach
    void setUp() {
        externAlertService = new AlibabaCloudCmsExternAlertService(alarmCommonReduce);
    }

    @Test
    void shouldConvertTriggeredAlert() {
        externAlertService.addExternAlert("""
                {
                  "specversion": "1.0",
                  "id": "alert-event-1",
                  "type": "ALERT",
                  "subtype": "NORMAL_TRIGGER",
                  "time": "2026-07-29T06:00:00Z",
                  "timestamp": 1785300000123,
                  "subject": "ECS CPU usage is high",
                  "severity": "WARNING",
                  "status": "OCCURRED",
                  "userId": "123456",
                  "ruleId": "rule-1",
                  "workspace": "default-cms-123456-cn-hangzhou",
                  "traceId": "trace-1",
                  "alertMessage": "CPU usage exceeded 80%",
                  "alertEntityId": "ecs:i-123",
                  "resource": {
                    "entity": {
                      "domain": "ecs",
                      "entity_type": "instance",
                      "entity_id": "i-123",
                      "prop": {
                        "instanceName": "api-server"
                      }
                    },
                    "tags": {
                      "regionId": "cn-hangzhou",
                      "environment": "production"
                    }
                  },
                  "labels": {
                    "_cms_region": "cn-hangzhou",
                    "customNumber": 7
                  },
                  "annotations": {
                    "current_value": "92.5"
                  },
                  "data": {
                    "value": 92.5,
                    "threshold": 80,
                    "comparisonOperator": ">"
                  },
                  "alertEntityFields": {
                    "privateIp": "10.0.0.1"
                  },
                  "alertHistoryUrl": "https://cmsnext.console.aliyun.com/history",
                  "futureField": "ignored"
                }
                """);

        SingleAlert alert = captureAlert();
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, alert.getStatus());
        assertEquals(EVENT_TIME, alert.getStartAt());
        assertEquals(EVENT_TIME, alert.getActiveAt());
        assertNull(alert.getEndAt());
        assertEquals("CPU usage exceeded 80%", alert.getContent());
        assertEquals("alibabacloud-cms", alert.getLabels().get("__source__"));
        assertEquals("ECS CPU usage is high", alert.getLabels().get("alertname"));
        assertEquals(CommonConstants.ALERT_SEVERITY_WARNING, alert.getLabels().get("severity"));
        assertEquals("instance", alert.getLabels().get("resourceType"));
        assertEquals("i-123", alert.getLabels().get("resourceId"));
        assertEquals("7", alert.getLabels().get("customNumber"));
        assertEquals("api-server", alert.getAnnotations().get("instanceName"));
        assertEquals("92.5", alert.getAnnotations().get("value"));
        assertEquals("80", alert.getAnnotations().get("threshold"));
        assertEquals("10.0.0.1", alert.getAnnotations().get("privateIp"));
    }

    @Test
    void shouldConvertResolvedAlertAndIsoTime() {
        externAlertService.addExternAlert("""
                {
                  "subtype": "NORMAL_RESOLVE",
                  "time": "2026-07-29T06:00:00Z",
                  "subject": "ECS CPU usage is high",
                  "severity": "CRITICAL",
                  "status": "RESOLVED",
                  "labels": {
                    "instanceId": "i-123"
                  }
                }
                """);

        SingleAlert alert = captureAlert();
        long expectedTime = Instant.parse("2026-07-29T06:00:00Z").toEpochMilli();
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, alert.getStatus());
        assertEquals(expectedTime, alert.getStartAt());
        assertNull(alert.getActiveAt());
        assertEquals(expectedTime, alert.getEndAt());
        assertEquals("ECS CPU usage is high", alert.getContent());
        assertEquals(CommonConstants.ALERT_SEVERITY_CRITICAL, alert.getLabels().get("severity"));
    }

    @Test
    void shouldTreatRecoveredStatusAsResolved() {
        externAlertService.addExternAlert("""
                {
                  "timestamp": 1785300000123,
                  "subject": "Recovered alert",
                  "status": "RECOVERED"
                }
                """);

        SingleAlert alert = captureAlert();
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, alert.getStatus());
        assertEquals(EVENT_TIME, alert.getEndAt());
    }

    @Test
    void shouldIgnoreInvalidPayload() {
        externAlertService.addExternAlert("invalid json");
        externAlertService.addExternAlert("{\"subject\":\"missing status\"}");

        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
        assertEquals("alibabacloud-cms", externAlertService.supportSource());
    }

    private SingleAlert captureAlert() {
        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(captor.capture());
        return captor.getValue();
    }
}
