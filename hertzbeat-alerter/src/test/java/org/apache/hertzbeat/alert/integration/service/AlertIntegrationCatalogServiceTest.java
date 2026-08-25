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

package org.apache.hertzbeat.alert.integration.service;

import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness.READY;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.UNVERIFIED;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.VERIFIED;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.IntegrationGuide;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.IntegrationVerification;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationRequestException;
import org.apache.hertzbeat.alert.integration.guide.AlertIntegrationDescriptorRegistry;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.alert.service.impl.AlertManagerExternAlertService;
import org.apache.hertzbeat.alert.service.impl.AlibabaCloudSlsExternAlertService;
import org.apache.hertzbeat.alert.service.impl.DefaultExternAlertService;
import org.apache.hertzbeat.alert.service.impl.HuaweiCloudExternAlertService;
import org.apache.hertzbeat.alert.service.impl.PrometheusExternAlertService;
import org.apache.hertzbeat.alert.service.impl.SkyWalkingExternAlertService;
import org.apache.hertzbeat.alert.service.impl.TencentExternAlertService;
import org.apache.hertzbeat.alert.service.impl.UptimeKumaExternAlertServiceImpl;
import org.apache.hertzbeat.alert.service.impl.VolcEngineExternAlertService;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.alert.service.impl.ZabbixExternAlertServiceImpl;
import org.junit.jupiter.api.Test;

class AlertIntegrationCatalogServiceTest {

    private static final List<String> PUBLIC_SOURCE_ORDER = List.of(
            "webhook", "prometheus", "alertmanager", "skywalking", "uptime-kuma", "zabbix", "tencent",
            "alibabacloud-sls", "huaweicloud-ces", "volcengine");
    private static final String PRIVATE_SOURCE = "private-test-source";
    private static final String PRIVATE_TOKEN = "private-test-token";

    @Test
    void derivesStablePublicCatalogFromRegisteredIngressBeans() {
        AlertIntegrationCatalogService service = service(services());

        assertEquals(PUBLIC_SOURCE_ORDER, service.catalog("workspace-a").items().stream()
                .map(item -> item.source())
                .toList());
        assertFalse(service.catalog("workspace-a").items().stream()
                .anyMatch(item -> "default".equals(item.source())));
        assertFalse(service.catalog("workspace-a").toString().contains(PRIVATE_SOURCE));
        assertFalse(service.catalog("workspace-a").toString().contains(PRIVATE_TOKEN));
        for (String source : PUBLIC_SOURCE_ORDER) {
            IntegrationGuide guide = service.render(source);
            assertEquals(source, guide.source());
            assertFalse(guide.toString().contains(PRIVATE_SOURCE));
            assertFalse(guide.toString().contains(PRIVATE_TOKEN));
        }
    }

    @Test
    void rendersHonestReadyAndBlockedSourceContracts() {
        AlertIntegrationCatalogService service = service(services());

        IntegrationGuide webhook = service.render("webhook");
        assertEquals(READY, webhook.readiness());
        assertEquals("POST", webhook.method());
        assertEquals("/api/alerts/report", webhook.ingressPath());
        assertEquals("single_alert", webhook.payloadShape());
        assertEquals("Bearer {token}", webhook.requiredHeaders().get("Authorization"));
        assertTrue(webhook.requiredFields().contains("labels"));
        assertTrue(webhook.snippets().stream().anyMatch(snippet -> snippet.contains("\"labels\"")));

        IntegrationGuide prometheus = service.render("prometheus");
        assertEquals(READY, prometheus.readiness());
        assertEquals("/api/v2/alerts", prometheus.ingressPath());
        assertEquals("Bearer {token}", prometheus.requiredHeaders().get("Authorization"));
        assertTrue(prometheus.snippets().stream().anyMatch(snippet -> snippet.trim().startsWith("[")));

        IntegrationGuide alertmanager = service.render("alertmanager");
        assertEquals(READY, alertmanager.readiness());
        assertEquals("/api/alerts/report/alertmanager", alertmanager.ingressPath());
        assertEquals("Bearer {token}", alertmanager.requiredHeaders().get("Authorization"));
        assertTrue(alertmanager.snippets().stream().anyMatch(snippet -> snippet.contains("\"alerts\"")));

        IntegrationGuide zabbix = service.render("zabbix");
        assertEquals(READY, zabbix.readiness());
        assertEquals("/api/alerts/report/zabbix", zabbix.ingressPath());
        assertEquals("Bearer {token}", zabbix.requiredHeaders().get("Authorization"));
        assertTrue(zabbix.limitations().isEmpty());
        assertTrue(zabbix.steps().contains("alert.integration.zabbix.step.configure_media_type"));
        assertTrue(zabbix.steps().contains("alert.integration.zabbix.step.verify_problem_and_recovery"));
        assertTrue(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("{EVENT.TIMESTAMP}")));
        assertTrue(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("{EVENT.RECOVERY.TIMESTAMP}")));
        assertTrue(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("{EVENT.NSEVERITY}")));
        assertTrue(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("'3': 'critical'")));
        assertFalse(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("'3': 'error'")));
        assertTrue(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("|| 'critical'")));
        assertTrue(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("Authorization: Bearer ")));
        assertTrue(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("getStatus()")));
        assertTrue(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("response.code !== 0")));
        assertFalse(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("request.Status()")));
        assertFalse(zabbix.snippets().stream().anyMatch(snippet -> snippet.contains("response.errcode")));
        for (String source : PUBLIC_SOURCE_ORDER) {
            assertEquals(READY, service.render(source).readiness(), source);
        }

        IntegrationGuide skyWalking = service.render("skywalking");
        assertEquals(Map.of("Authorization", "Bearer {token}"), skyWalking.requiredHeaders());
        assertTrue(skyWalking.requiredFields().containsAll(List.of("[].uuid", "[].recoveryTime")));
        assertTrue(skyWalking.steps().contains("alert.integration.skywalking.step.configure_webhook"));
        assertTrue(skyWalking.snippets().stream().anyMatch(snippet -> snippet.contains("recovery-urls")));

        IntegrationGuide uptimeKuma = service.render("uptime-kuma");
        assertEquals(Map.of("Authorization", "Bearer {token}"), uptimeKuma.requiredHeaders());
        assertTrue(uptimeKuma.steps().contains("alert.integration.uptime-kuma.step.configure_webhook"));
        assertTrue(uptimeKuma.snippets().stream().anyMatch(snippet -> snippet.contains("webhookContentType")));
        assertTrue(uptimeKuma.snippets().stream()
                .allMatch(snippet -> JsonUtil.fromJsonQuietly(snippet) != null));

        IntegrationGuide tencent = service.render("tencent");
        assertEquals(Map.of("Authorization", "Bearer {token}"), tencent.requiredHeaders());
        assertTrue(tencent.steps().contains("alert.integration.tencent.step.configure_template"));
        assertTrue(tencent.snippets().stream().anyMatch(snippet -> snippet.contains("alarmObjInfo")));

        IntegrationGuide alibaba = service.render("alibabacloud-sls");
        assertEquals(Map.of("Authorization", "Bearer {token}"), alibaba.requiredHeaders());
        assertTrue(alibaba.requiredFields().contains("alert_instance_id"));
        assertTrue(alibaba.steps().contains("alert.integration.alibabacloud-sls.step.configure_action"));
        assertTrue(alibaba.snippets().stream().anyMatch(snippet -> snippet.contains("alert_instance_id")));

        IntegrationGuide huawei = service.render("huaweicloud-ces");
        assertEquals(Map.of("X-HertzBeat-Token", "{token}"), huawei.requiredHeaders());
        assertTrue(huawei.steps().contains("alert.integration.huaweicloud-ces.step.configure_subscription"));
        assertTrue(huawei.steps().contains("alert.integration.huaweicloud-ces.step.verify_subscription"));
        assertTrue(huawei.limitations().contains("alert.integration.limit.huaweicloud-ces.confirmation_may_be_billable"));

        IntegrationGuide volcengine = service.render("volcengine");
        assertEquals(Map.of("Token", "{token}"), volcengine.requiredHeaders());
        assertTrue(volcengine.requiredFields().containsAll(List.of(
                "Type", "RuleName", "RuleId", "HappenedAt", "RecoveredResources[].Id")));
        assertTrue(volcengine.steps().contains("alert.integration.volcengine.step.configure_callback"));
        assertTrue(volcengine.snippets().stream().anyMatch(snippet -> snippet.contains("MetricRecovered")));
    }

    @Test
    void rejectsRegistryAndBeanDriftWithSafeStableErrors() {
        List<ExternAlertService> missingBean = new ArrayList<>(services());
        missingBean.removeLast();
        AlertIntegrationRequestException missingFailure = assertThrows(
                AlertIntegrationRequestException.class, () -> service(missingBean).catalog("workspace-a"));
        assertEquals("external_alert_guide_unavailable", missingFailure.getMessage());

        List<ExternAlertService> extraBean = new ArrayList<>(services());
        ExternAlertService unsupported = mock(ExternAlertService.class);
        org.mockito.Mockito.when(unsupported.supportSource()).thenReturn("private-source-name");
        extraBean.add(unsupported);
        AlertIntegrationRequestException extraFailure = assertThrows(
                AlertIntegrationRequestException.class, () -> service(extraBean).catalog("workspace-a"));
        assertEquals("external_alert_guide_unavailable", extraFailure.getMessage());
    }

    @Test
    void rendersRunnableVolcengineRecoveryExample() {
        AlarmCommonReduce reducer = mock(AlarmCommonReduce.class);
        IntegrationGuide guide = service(services()).render("volcengine");

        new VolcEngineExternAlertService(reducer).addExternAlert("workspace-a", guide.snippets().getFirst());

        org.mockito.Mockito.verify(reducer).reduceAndSendAlarm(
                org.mockito.ArgumentMatchers.eq("workspace-a"),
                org.mockito.ArgumentMatchers.any(SingleAlert.class));
    }

    @Test
    void unknownSourcesUseSafeStableErrors() {
        AlertIntegrationRequestException failure = assertThrows(
                AlertIntegrationRequestException.class,
                () -> service(services()).render(PRIVATE_SOURCE));

        assertEquals("external_alert_source_unsupported", failure.getMessage());
        assertFalse(failure.getMessage().contains(PRIVATE_SOURCE));
        assertFalse(failure.getMessage().contains(PRIVATE_TOKEN));
    }

    @Test
    void blankSourcesUseSafeStableErrors() {
        AlertIntegrationCatalogService service = service(services());

        for (String source : List.of("", " ", "\t")) {
            AlertIntegrationRequestException failure = assertThrows(
                    AlertIntegrationRequestException.class, () -> service.render(source));
            assertEquals("external_alert_source_unsupported", failure.getMessage());
        }
    }

    @Test
    void overlaysOnlyTheCurrentWorkspaceVerificationEvidence() {
        AlertIntegrationVerificationService verificationService = mock(AlertIntegrationVerificationService.class);
        when(verificationService.evidenceBySource("workspace-a")).thenReturn(Map.of(
                "volcengine", new IntegrationVerification(VERIFIED, 100L, 200L)));
        when(verificationService.unverified()).thenReturn(new IntegrationVerification(UNVERIFIED, null, null));
        AlertIntegrationCatalogService service = new AlertIntegrationCatalogService(
                services(), AlertIntegrationDescriptorRegistry.official(), verificationService);

        var items = service.catalog("workspace-a").items();

        assertEquals(VERIFIED, items.stream()
                .filter(item -> "volcengine".equals(item.source()))
                .findFirst().orElseThrow().verification().status());
        assertEquals(UNVERIFIED, items.stream()
                .filter(item -> "webhook".equals(item.source()))
                .findFirst().orElseThrow().verification().status());
    }

    @Test
    void startsVerificationOnlyForRegisteredPublicSource() {
        AlertIntegrationVerificationService verificationService = mock(AlertIntegrationVerificationService.class);
        IntegrationVerification waiting = new IntegrationVerification(
                org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.VerificationStatus.WAITING,
                100L,
                null);
        when(verificationService.start("workspace-a", "volcengine")).thenReturn(waiting);
        AlertIntegrationCatalogService service = new AlertIntegrationCatalogService(
                services(), AlertIntegrationDescriptorRegistry.official(), verificationService);

        assertEquals(waiting, service.startVerification("workspace-a", "volcengine"));
        assertThrows(AlertIntegrationRequestException.class,
                () -> service.startVerification("workspace-a", PRIVATE_SOURCE));
    }

    private static AlertIntegrationCatalogService service(List<ExternAlertService> services) {
        AlertIntegrationVerificationService verificationService = mock(AlertIntegrationVerificationService.class);
        when(verificationService.evidenceBySource(org.mockito.ArgumentMatchers.anyString())).thenReturn(Map.of());
        when(verificationService.unverified()).thenReturn(new IntegrationVerification(UNVERIFIED, null, null));
        return new AlertIntegrationCatalogService(
                services, AlertIntegrationDescriptorRegistry.official(), verificationService);
    }

    private static List<ExternAlertService> services() {
        AlarmCommonReduce reducer = mock(AlarmCommonReduce.class);
        return List.of(
                new DefaultExternAlertService(),
                new AlertManagerExternAlertService(),
                new PrometheusExternAlertService(),
                new SkyWalkingExternAlertService(),
                new UptimeKumaExternAlertServiceImpl(),
                new ZabbixExternAlertServiceImpl(),
                new TencentExternAlertService(),
                new AlibabaCloudSlsExternAlertService(reducer),
                new HuaweiCloudExternAlertService(reducer),
                new VolcEngineExternAlertService(reducer));
    }
}
