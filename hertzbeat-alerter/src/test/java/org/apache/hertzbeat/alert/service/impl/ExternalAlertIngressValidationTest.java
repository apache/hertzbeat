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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.List;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
    private AlibabaCloudSlsExternAlertService alibabaCloudSlsService;
    private HuaweiCloudExternAlertService huaweiCloudService;
    private SkyWalkingExternAlertService skyWalkingService;
    private TencentExternAlertService tencentService;
    private UptimeKumaExternAlertServiceImpl uptimeKumaService;
    private VolcEngineExternAlertService volcEngineService;

    @BeforeEach
    void setUp() {
        defaultService = withReducer(new DefaultExternAlertService());
        prometheusService = withReducer(new PrometheusExternAlertService());
        alertManagerService = withReducer(new AlertManagerExternAlertService());
        zabbixService = withReducer(new ZabbixExternAlertServiceImpl());
        alibabaCloudSlsService = new AlibabaCloudSlsExternAlertService(alarmCommonReduce);
        huaweiCloudService = new HuaweiCloudExternAlertService(alarmCommonReduce);
        skyWalkingService = withReducer(new SkyWalkingExternAlertService());
        tencentService = withReducer(new TencentExternAlertService());
        uptimeKumaService = withReducer(new UptimeKumaExternAlertServiceImpl());
        volcEngineService = new VolcEngineExternAlertService(alarmCommonReduce);
    }

    @Test
    void rejectsMalformedAndEmptyPayloadsBeforeAsyncSubmission() {
        assertThrows(IllegalArgumentException.class, () -> defaultService.addExternAlert("default", "not-json"));
        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert("default", "not-json"));
        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert("default", "null"));
        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert("default", "[]"));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert("default", "not-json"));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert("default", "null"));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert("default", "{}"));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert("default", "{\"alerts\":[]}"));
        assertThrows(IllegalArgumentException.class, () -> zabbixService.addExternAlert("default", "not-json"));
        assertThrows(IllegalArgumentException.class,
                () -> alibabaCloudSlsService.addExternAlert("default", "not-json"));
        assertThrows(IllegalArgumentException.class,
                () -> alibabaCloudSlsService.addExternAlert("default", "[]"));
        assertThrows(IllegalArgumentException.class,
                () -> huaweiCloudService.addExternAlert("default", "not-json"));
        assertThrows(IllegalArgumentException.class,
                () -> skyWalkingService.addExternAlert("default", "not-json"));
        assertThrows(IllegalArgumentException.class,
                () -> skyWalkingService.addExternAlert("default", "[]"));
        assertThrows(IllegalArgumentException.class,
                () -> tencentService.addExternAlert("default", "not-json"));
        assertThrows(IllegalArgumentException.class,
                () -> uptimeKumaService.addExternAlert("default", "not-json"));
        assertThrows(IllegalArgumentException.class,
                () -> volcEngineService.addExternAlert("default", "not-json"));

        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(), any(SingleAlert.class));
    }

    @Test
    void rejectsMissingOrEmptyBusinessLabelsBeforeAddingSyntheticSource() {
        assertThrows(IllegalArgumentException.class, () -> defaultService.addExternAlert("default", "{}"));
        assertThrows(IllegalArgumentException.class,
                () -> defaultService.addExternAlert("default", "{\"labels\":{}}"));
        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert("default", "[{}]"));
        assertThrows(IllegalArgumentException.class,
                () -> prometheusService.addExternAlert("default", "[{\"labels\":{}}]"));
        assertThrows(IllegalArgumentException.class,
                () -> alertManagerService.addExternAlert("default", "{\"alerts\":[{}]}"));
        assertThrows(IllegalArgumentException.class,
                () -> alertManagerService.addExternAlert("default", "{\"alerts\":[{\"labels\":{}}]}"));
        assertThrows(IllegalArgumentException.class, () -> zabbixService.addExternAlert("default", "{}"));
        assertThrows(IllegalArgumentException.class, () -> zabbixService.addExternAlert("default", "{\"labels\":{}}"));

        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(), any(SingleAlert.class));
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
        String alibabaCloudSlsBatch = """
                [
                  {
                    "alert_name":"first",
                    "project":"project-a",
                    "region":"cn-hangzhou",
                    "status":"firing",
                    "fire_time":1,
                    "alert_time":1
                  },
                  null
                ]""";

        assertThrows(IllegalArgumentException.class, () -> prometheusService.addExternAlert("default", prometheusBatch));
        assertThrows(IllegalArgumentException.class, () -> alertManagerService.addExternAlert("default", alertManagerBatch));
        assertThrows(IllegalArgumentException.class,
                () -> alibabaCloudSlsService.addExternAlert("default", alibabaCloudSlsBatch));

        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(), any(SingleAlert.class));
    }

    @Test
    void normalizesAnnotationsAndSubmitsProcessableAlerts() {
        defaultService.addExternAlert("default", "{\"labels\":{\"alertname\":\"default\"}}");
        prometheusService.addExternAlert("default", "[{\"labels\":{\"alertname\":\"prometheus\"}}]");
        alertManagerService.addExternAlert("default",
                "{\"alerts\":[{\"labels\":{\"alertname\":\"alertmanager\"}}]}");
        zabbixService.addExternAlert("default", "{\"labels\":{\"alertname\":\"zabbix\"}}");

        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce, times(4)).reduceAndSendAlarm(eq("default"), captor.capture());
        List<SingleAlert> submittedAlerts = captor.getAllValues();
        for (SingleAlert alert : submittedAlerts) {
            assertFalse(alert.getLabels().isEmpty());
            assertNotNull(alert.getAnnotations());
        }
    }

    @Test
    void authenticatedWorkspaceWinsAndReservedPayloadLabelsAreRemoved() {
        defaultService.addExternAlert("team-a", """
                {"labels":{"alertname":"database-down","workspace_id":"team-b",\
                "X-HertzBeat-Workspace-Id":"team-c"}}""");

        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(eq("team-a"), captor.capture());
        assertFalse(captor.getValue().getLabels().containsKey("workspace_id"));
        assertFalse(captor.getValue().getLabels().containsKey("X-HertzBeat-Workspace-Id"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "workspace",
        "workspace_id",
        "workspace.id",
        "hertzbeat.workspace_id",
        "x-hertzbeat-workspace-id"
    })
    void everyReservedWorkspaceLabelIsRemovedBeforeSubmission(String reservedLabel) {
        defaultService.addExternAlert("team-a", "{\"labels\":{\"alertname\":\"database-down\",\""
                + reservedLabel + "\":\"forged\"}}");

        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(eq("team-a"), captor.capture());
        assertFalse(captor.getValue().getLabels().containsKey(reservedLabel));
    }

    @ParameterizedTest
    @ValueSource(strings = {"hertzbeat.monitor.id", "hertzbeat.entity.id"})
    void externalAlertsCannotForgeInternalResourceAuthority(String reservedLabel) {
        defaultService.addExternAlert("team-a", "{\"labels\":{\"alertname\":\"database-down\",\""
                + reservedLabel + "\":\"42\"}}");

        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(eq("team-a"), captor.capture());
        assertFalse(captor.getValue().getLabels().containsKey(reservedLabel));
    }

    private <T> T withReducer(T service) {
        ReflectionTestUtils.setField(service, "alarmCommonReduce", alarmCommonReduce);
        return service;
    }
}
