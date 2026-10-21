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

import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_FIRING;
import static org.apache.hertzbeat.common.constants.CommonConstants.ALERT_STATUS_RESOLVED;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dto.AlibabaCloudSlsExternAlert;
import org.apache.hertzbeat.alert.dto.VolcEngineExternMetricAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ExternalAlertLifecycleConversionTest {

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @Test
    void skyWalkingUsesOfficialUuidAndRecoveryTimeForOneLifecycle() {
        SkyWalkingExternAlertService service = withReducer(new SkyWalkingExternAlertService());
        service.addExternAlert("default", skyWalkingPayload(null));
        service.addExternAlert("default", skyWalkingPayload(1_787_472_600_000L));

        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce, times(2)).reduceAndSendAlarm(eq("default"), captor.capture());
        SingleAlert firing = captor.getAllValues().get(0);
        SingleAlert resolved = captor.getAllValues().get(1);

        assertEquals(ALERT_STATUS_FIRING, firing.getStatus());
        assertNull(firing.getEndAt());
        assertEquals(ALERT_STATUS_RESOLVED, resolved.getStatus());
        assertEquals(1_787_472_600_000L, resolved.getEndAt());
        assertEquals(firing.getLabels(), resolved.getLabels());
        assertEquals("alarm-uuid-1", firing.getLabels().get("skywalking_uuid"));
    }

    @Test
    void tencentFingerprintSeparatesResourcesAndKeepsRecoveryStable() {
        TencentExternAlertService service = withReducer(new TencentExternAlertService());
        service.addExternAlert("default", tencentPayload("instance-a", "1"));
        service.addExternAlert("default", tencentPayload("instance-b", "1"));
        service.addExternAlert("default", tencentPayload("instance-a", "0"));

        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce, times(3)).reduceAndSendAlarm(eq("default"), captor.capture());
        SingleAlert firstResource = captor.getAllValues().get(0);
        SingleAlert secondResource = captor.getAllValues().get(1);
        SingleAlert firstResourceRecovery = captor.getAllValues().get(2);

        assertNotEquals(firstResource.getLabels(), secondResource.getLabels());
        assertEquals(firstResource.getLabels(), firstResourceRecovery.getLabels());
        assertEquals("policy-a", firstResource.getLabels().get("policy_id"));
        assertEquals("instance-a", firstResource.getLabels().get("instance_id"));
    }

    @Test
    void alibabaSlsFingerprintIncludesOfficialAlertIdentity() {
        AlibabaCloudSlsExternAlert first = slsAlert("instance-a");
        AlibabaCloudSlsExternAlert second = slsAlert("instance-b");
        AlibabaCloudSlsExternAlertService.AlibabaCloudSlsConverter converter =
                new AlibabaCloudSlsExternAlertService.AlibabaCloudSlsConverter();

        Map<String, String> firstLabels = converter.convert(first).getLabels();
        Map<String, String> secondLabels = converter.convert(second).getLabels();

        assertNotEquals(firstLabels, secondLabels);
        assertEquals("rule-a", firstLabels.get("alert_id"));
        assertEquals("instance-a", firstLabels.get("alert_instance_id"));
    }

    @Test
    void volcengineOnlySetsEndTimeForRecovery() {
        VolcEngineExternAlertService.VolcEngineAlertConverter converter =
                new VolcEngineExternAlertService.VolcEngineAlertConverter();
        SingleAlert firing = converter.convertMetricAlertToSingeAlert(
                volcengineMetric("Metric", 1_787_472_000L)).getFirst();
        SingleAlert resolved = converter.convertMetricAlertToSingeAlert(
                volcengineMetric("MetricRecovered", 1_787_472_600L)).getFirst();

        assertEquals(ALERT_STATUS_FIRING, firing.getStatus());
        assertNull(firing.getEndAt());
        assertEquals(ALERT_STATUS_RESOLVED, resolved.getStatus());
        assertEquals(1_787_472_600_000L, resolved.getEndAt());
        assertEquals(firing.getLabels(), resolved.getLabels());
    }

    @Test
    void uptimeKumaRecoveryCarriesItsObservedEndTime() {
        UptimeKumaExternAlertServiceImpl service = withReducer(new UptimeKumaExternAlertServiceImpl());
        service.addExternAlert("default", """
                {
                  "heartbeat":{"monitorID":7,"status":1,"time":"2026-08-23 10:10:00","msg":"up"},
                  "monitor":{"id":7,"name":"api","description":"public api"}
                }""");

        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce).reduceAndSendAlarm(eq("default"), captor.capture());
        assertEquals(ALERT_STATUS_RESOLVED, captor.getValue().getStatus());
        assertNotNull(captor.getValue().getEndAt());
        assertEquals(captor.getValue().getActiveAt(), captor.getValue().getEndAt());
    }

    private String skyWalkingPayload(Long recoveryTime) {
        String recoveryField = recoveryTime == null ? "null" : recoveryTime.toString();
        return """
                [{
                  "scopeId":1,
                  "scope":"SERVICE",
                  "name":"checkout",
                  "uuid":"alarm-uuid-1",
                  "id0":"service-id",
                  "id1":"",
                  "ruleName":"service_sla_rule",
                  "alarmMessage":"service availability is low",
                  "startTime":1787472000000,
                  "recoveryTime":%s,
                  "tags":[{"key":"level","value":"WARNING"}]
                }]""".formatted(recoveryField);
    }

    private String tencentPayload(String instanceId, String status) {
        return """
                {
                  "sessionID":"session-%s-%s",
                  "alarmStatus":"%s",
                  "alarmType":"metric",
                  "firstOccurTime":"2026-08-23 10:00:00",
                  "recoverTime":"2026-08-23 10:10:00",
                  "alarmObjInfo":{
                    "region":"ap-shanghai",
                    "namespace":"qce/cvm",
                    "appID":"app-a",
                    "uin":"uin-a",
                    "dimensions":{"unInstanceID":"%s","objID":"object-a"}
                  },
                  "alarmPolicyInfo":{
                    "policyID":"policy-a",
                    "policyType":"monitor",
                    "policyName":"cpu policy",
                    "conditions":{"metricName":"CPUUsage","metricShowName":"CPU usage"}
                  }
                }""".formatted(instanceId, status, status, instanceId);
    }

    private AlibabaCloudSlsExternAlert slsAlert(String instanceId) {
        return AlibabaCloudSlsExternAlert.builder()
                .alertInstanceId(instanceId)
                .alertId("rule-a")
                .alertName("query latency")
                .region("cn-hangzhou")
                .project("project-a")
                .alertTime(1_787_472_000)
                .fireTime(1_787_472_000)
                .status(ALERT_STATUS_FIRING)
                .build();
    }

    private VolcEngineExternMetricAlert volcengineMetric(String type, long lastAlertTime) {
        VolcEngineExternMetricAlert.Resource resource = VolcEngineExternMetricAlert.Resource.builder()
                .id("resource-a")
                .name("instance-a")
                .region("cn-beijing")
                .firstAlertTime(1_787_472_000L)
                .lastAlertTime(lastAlertTime)
                .metrics(List.of())
                .dimensions(List.of())
                .build();
        VolcEngineExternMetricAlert.VolcEngineExternMetricAlertBuilder builder = VolcEngineExternMetricAlert.builder()
                .type(type)
                .ruleId("rule-a")
                .ruleCondition("cpu usage is high")
                .happenedAt("2026-08-23 10:10:00+08:00");
        return "MetricRecovered".equals(type)
                ? builder.recoveredResources(List.of(resource)).build()
                : builder.resources(List.of(resource)).build();
    }

    private <T> T withReducer(T service) {
        ReflectionTestUtils.setField(service, "alarmCommonReduce", alarmCommonReduce);
        return service;
    }
}
