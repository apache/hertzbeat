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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.List;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ExternalAlertIngressValidationTest {

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    private DefaultExternAlertService defaultService;
    private PrometheusExternAlertService prometheusService;
    private AlertManagerExternAlertService alertManagerService;
    private ZabbixExternAlertServiceImpl zabbixService;

    @BeforeEach
    void setUp() {
        defaultService = withReducer(new DefaultExternAlertService());
        prometheusService = withReducer(new PrometheusExternAlertService());
        alertManagerService = withReducer(new AlertManagerExternAlertService());
        zabbixService = withReducer(new ZabbixExternAlertServiceImpl());
    }

    @Test
    void rejectsMalformedAndEmptyPayloadsBeforeAsyncSubmission() {
        assertThrows(IllegalArgumentException.class, () -> defaultService.addExternAlert("not-json"));
        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert("not-json"));
        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert("null"));
        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert("[]"));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert("not-json"));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert("null"));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert("{}"));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert("{\"alerts\":[]}"));
        assertThrows(IllegalArgumentException.class, () -> zabbixService.addExternAlert("not-json"));

        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void rejectsMissingOrEmptyBusinessLabelsBeforeAddingSyntheticSource() {
        assertThrows(IllegalArgumentException.class, () -> defaultService.addExternAlert("{}"));
        assertThrows(IllegalArgumentException.class,
                () -> defaultService.addExternAlert("{\"labels\":{}}"));
        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert("[{}]"));
        assertThrows(IllegalArgumentException.class,
                () -> prometheusService.addExternAlert("[{\"labels\":{}}]"));
        assertThrows(IllegalArgumentException.class,
                () -> alertManagerService.addExternAlert("{\"alerts\":[{}]}"));
        assertThrows(IllegalArgumentException.class,
                () -> alertManagerService.addExternAlert("{\"alerts\":[{\"labels\":{}}]}"));
        assertThrows(IllegalArgumentException.class, () -> zabbixService.addExternAlert("{}"));
        assertThrows(IllegalArgumentException.class, () -> zabbixService.addExternAlert("{\"labels\":{}}"));

        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void validatesCompleteBatchBeforeSubmittingAnyElement() {
        String prometheusBatch = """
                [
                  {"labels":{"alertname":"first"}},
                  null
                ]""";
        String alertManagerBatch = """
                {
                  "alerts":[
                    {"labels":{"alertname":"first"}},
                    null
                  ]
                }""";

        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert(prometheusBatch));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert(alertManagerBatch));

        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void normalizesAnnotationsAndSubmitsProcessableAlerts() {
        defaultService.addExternAlert("{\"labels\":{\"alertname\":\"default\"}}");
        prometheusService.addExternAlert("[{\"labels\":{\"alertname\":\"prometheus\"}}]");
        alertManagerService.addExternAlert(
                "{\"alerts\":[{\"labels\":{\"alertname\":\"alertmanager\"}}]}");
        zabbixService.addExternAlert("{\"labels\":{\"alertname\":\"zabbix\"}}");

        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce, times(4)).reduceAndSendAlarm(captor.capture());
        List<SingleAlert> submittedAlerts = captor.getAllValues();
        for (SingleAlert alert : submittedAlerts) {
            assertFalse(alert.getLabels().isEmpty());
            assertNotNull(alert.getAnnotations());
        }
    }

    private <T> T withReducer(T service) {
        ReflectionTestUtils.setField(service, "alarmCommonReduce", alarmCommonReduce);
        return service;
    }
}
