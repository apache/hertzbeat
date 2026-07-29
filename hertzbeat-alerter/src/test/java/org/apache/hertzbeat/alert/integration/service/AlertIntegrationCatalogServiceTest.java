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

import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness.CONFIGURATION_REQUIRED;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness.GUIDE_BLOCKED;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness.READY;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.IntegrationGuide;
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

        assertEquals(PUBLIC_SOURCE_ORDER, service.catalog().items().stream()
                .map(item -> item.source())
                .toList());
        assertFalse(service.catalog().items().stream().anyMatch(item -> "default".equals(item.source())));
        assertFalse(service.catalog().toString().contains(PRIVATE_SOURCE));
        assertFalse(service.catalog().toString().contains(PRIVATE_TOKEN));
        for (String source : PUBLIC_SOURCE_ORDER) {
            IntegrationGuide guide = service.render(source);
            assertEquals(source, guide.source());
            assertEquals(Map.of("Authorization", "Bearer {token}"), guide.requiredHeaders());
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

        assertEquals(GUIDE_BLOCKED, service.render("zabbix").readiness());
        assertTrue(service.render("zabbix").limitations().contains(
                "alert.integration.limit.zabbix.response_contract_mismatch"));
        assertEquals(CONFIGURATION_REQUIRED, service.render("skywalking").readiness());
        assertEquals(CONFIGURATION_REQUIRED, service.render("huaweicloud-ces").readiness());
    }

    @Test
    void rejectsRegistryAndBeanDriftWithSafeStableErrors() {
        List<ExternAlertService> missingBean = new ArrayList<>(services());
        missingBean.removeLast();
        AlertIntegrationRequestException missingFailure = assertThrows(
                AlertIntegrationRequestException.class, () -> service(missingBean).catalog());
        assertEquals("external_alert_guide_unavailable", missingFailure.getMessage());

        List<ExternAlertService> extraBean = new ArrayList<>(services());
        ExternAlertService unsupported = mock(ExternAlertService.class);
        org.mockito.Mockito.when(unsupported.supportSource()).thenReturn("private-source-name");
        extraBean.add(unsupported);
        AlertIntegrationRequestException extraFailure = assertThrows(
                AlertIntegrationRequestException.class, () -> service(extraBean).catalog());
        assertEquals("external_alert_guide_unavailable", extraFailure.getMessage());
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

    private static AlertIntegrationCatalogService service(List<ExternAlertService> services) {
        return new AlertIntegrationCatalogService(services, AlertIntegrationDescriptorRegistry.official());
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
