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

package org.apache.hertzbeat.alert.integration.guide;

import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness.READY;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.IntegrationGuide;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness;
import org.springframework.stereotype.Component;

/**
 * Frozen structured descriptors for the currently registered alert ingress adapters.
 */
@Component
public class AlertIntegrationDescriptorRegistry {

    private static final String ACKNOWLEDGEMENT = "alert.integration.ack.accepted_for_processing";
    private final List<AlertIntegrationDescriptor> descriptors;
    private final Set<String> ingressSources;
    private final Map<String, AlertIntegrationDescriptor> byPublicSource;

    public AlertIntegrationDescriptorRegistry() {
        this(officialDescriptors());
    }

    AlertIntegrationDescriptorRegistry(List<AlertIntegrationDescriptor> descriptors) {
        LinkedHashMap<String, AlertIntegrationDescriptor> ingressIndex = new LinkedHashMap<>();
        LinkedHashMap<String, AlertIntegrationDescriptor> publicIndex = new LinkedHashMap<>();
        for (AlertIntegrationDescriptor descriptor : descriptors) {
            if (descriptor == null || descriptor.guide() == null
                    || ingressIndex.put(descriptor.ingressSource(), descriptor) != null
                    || publicIndex.put(descriptor.guide().source(), descriptor) != null) {
                throw new IllegalStateException("Duplicate or invalid alert integration descriptor");
            }
        }
        this.descriptors = List.copyOf(descriptors);
        this.ingressSources = Set.copyOf(ingressIndex.keySet());
        this.byPublicSource = Map.copyOf(publicIndex);
    }

    public List<AlertIntegrationDescriptor> descriptors() {
        return descriptors;
    }

    public Set<String> ingressSources() {
        return ingressSources;
    }

    public AlertIntegrationDescriptor findByPublicSource(String source) {
        return byPublicSource.get(source);
    }

    public static AlertIntegrationDescriptorRegistry official() {
        return new AlertIntegrationDescriptorRegistry();
    }

    private static List<AlertIntegrationDescriptor> officialDescriptors() {
        return List.of(
                descriptor("default", guide(
                        "webhook",
                        "hertzbeat",
                        "/api/alerts/report",
                        "single_alert",
                        List.of("labels", "content", "status", "startAt"),
                        List.of(
                                "alert.integration.webhook.step.create_token",
                                "alert.integration.webhook.step.configure_request",
                                "alert.integration.webhook.step.verify_alert"),
                        List.of("""
                                {
                                  "labels": {"alertname": "HighCPUUsage", "instance": "server-1"},
                                  "annotations": {"summary": "High CPU usage"},
                                  "content": "CPU usage exceeded the configured threshold.",
                                  "status": "firing",
                                  "triggerTimes": 1,
                                  "startAt": 1736580031832,
                                  "activeAt": 1736580031832,
                                  "endAt": null
                                }"""),
                        READY,
                        List.of())),
                descriptor("prometheus", guide(
                        "prometheus",
                        "prometheus",
                        "/api/v2/alerts",
                        "prometheus_alert_array",
                        List.of("[].labels", "[].annotations", "[].startsAt", "[].endsAt"),
                        List.of(
                                "alert.integration.prometheus.step.create_token",
                                "alert.integration.prometheus.step.configure_alertmanager_target",
                                "alert.integration.prometheus.step.verify_alert"),
                        List.of("""
                                [
                                  {
                                    "labels": {"alertname": "HighCPUUsage", "instance": "server-1"},
                                    "annotations": {"summary": "High CPU usage"},
                                    "startsAt": "2026-01-01T00:00:00Z",
                                    "endsAt": "0001-01-01T00:00:00Z"
                                  }
                                ]"""),
                        READY,
                        List.of())),
                descriptor("alertmanager", guide(
                        "alertmanager",
                        "prometheus",
                        "/api/alerts/report/alertmanager",
                        "alertmanager_webhook",
                        List.of("alerts", "alerts[].labels", "alerts[].startsAt", "alerts[].endsAt"),
                        List.of(
                                "alert.integration.alertmanager.step.create_token",
                                "alert.integration.alertmanager.step.configure_webhook",
                                "alert.integration.alertmanager.step.verify_alert"),
                        List.of("""
                                {
                                  "status": "firing",
                                  "alerts": [
                                    {
                                      "labels": {"alertname": "HighCPUUsage", "instance": "server-1"},
                                      "annotations": {"summary": "High CPU usage"},
                                      "startsAt": "2026-01-01T00:00:00Z",
                                      "endsAt": "0001-01-01T00:00:00Z"
                                    }
                                  ]
                                }"""),
                        READY,
                        List.of())),
                descriptor("skywalking", guide(
                        "skywalking",
                        "skywalking",
                        "/api/alerts/report/skywalking",
                        "skywalking_alert_array",
                        List.of("[].uuid", "[].alarmMessage", "[].startTime", "[].recoveryTime", "[].tags"),
                        List.of(
                                "alert.integration.skywalking.step.create_token",
                                "alert.integration.skywalking.step.configure_webhook",
                                "alert.integration.skywalking.step.verify_lifecycle"),
                        List.of(DirectAlertIntegrationGuideContent.SKYWALKING_WEBHOOK),
                        READY,
                        List.of())),
                descriptor("uptime-kuma", guide(
                        "uptime-kuma",
                        "uptime-kuma",
                        "/api/alerts/report/uptime-kuma",
                        "uptime_kuma_webhook",
                        List.of("heartbeat.status", "heartbeat.time", "monitor.id", "monitor.name"),
                        List.of(
                                "alert.integration.uptime-kuma.step.create_token",
                                "alert.integration.uptime-kuma.step.configure_webhook",
                                "alert.integration.uptime-kuma.step.verify_lifecycle"),
                        List.of(DirectAlertIntegrationGuideContent.UPTIME_KUMA_WEBHOOK),
                        READY,
                        List.of())),
                descriptor("zabbix", guide(
                        "zabbix",
                        "zabbix",
                        "/api/alerts/report/zabbix",
                        "single_alert",
                        List.of("labels", "content", "status", "startAt"),
                        List.of(
                                "alert.integration.zabbix.step.create_token",
                                "alert.integration.zabbix.step.configure_media_type",
                                "alert.integration.zabbix.step.verify_problem_and_recovery"),
                        List.of(
                                ZabbixIntegrationGuideContent.MEDIA_TYPE_PARAMETERS,
                                ZabbixIntegrationGuideContent.WEBHOOK_SCRIPT),
                        READY,
                        List.of())),
                descriptor("tencent", guide(
                        "tencent",
                        "tencent",
                        "/api/alerts/report/tencent",
                        "tencent_cloud_webhook",
                        List.of(
                                "alarmStatus",
                                "alarmType",
                                "firstOccurTime",
                                "alarmObjInfo",
                                "alarmPolicyInfo.conditions"),
                        List.of(
                                "alert.integration.tencent.step.create_token",
                                "alert.integration.tencent.step.configure_template",
                                "alert.integration.tencent.step.verify_lifecycle"),
                        List.of(DirectAlertIntegrationGuideContent.TENCENT_WEBHOOK_PAYLOAD),
                        READY,
                        List.of())),
                descriptor("alibabacloud-sls", guide(
                        "alibabacloud-sls",
                        "alibabacloud",
                        "/api/alerts/report/alibabacloud-sls",
                        "alibaba_cloud_sls_webhook",
                        List.of(
                                "alert_name",
                                "alert_id",
                                "alert_instance_id",
                                "status",
                                "fire_time",
                                "alert_time",
                                "region",
                                "project"),
                        List.of(
                                "alert.integration.alibabacloud-sls.step.create_token",
                                "alert.integration.alibabacloud-sls.step.configure_action",
                                "alert.integration.alibabacloud-sls.step.verify_lifecycle"),
                        List.of(DirectAlertIntegrationGuideContent.ALIBABA_SLS_WEBHOOK_PAYLOAD),
                        READY,
                        List.of())),
                descriptor("huaweicloud-ces", guide(
                        "huaweicloud-ces",
                        "huaweicloud",
                        "/api/alerts/report/huaweicloud-ces",
                        "huawei_cloud_smn_webhook",
                        List.of(
                                "signature",
                                "signing_cert_url",
                                "type",
                                "message",
                                "timestamp",
                                "topic_urn"),
                        List.of(
                                "alert.integration.huaweicloud-ces.step.create_token",
                                "alert.integration.huaweicloud-ces.step.configure_subscription",
                                "alert.integration.huaweicloud-ces.step.verify_subscription"),
                        List.of(),
                        READY,
                        List.of("alert.integration.limit.huaweicloud-ces.confirmation_may_be_billable"),
                        vendorTokenHeader("X-HertzBeat-Token"))),
                descriptor("volcengine", guide(
                        "volcengine",
                        "volcengine",
                        "/api/alerts/report/volcengine",
                        "volcengine_webhook",
                        List.of("Type", "RuleName", "RuleId", "HappenedAt", "RecoveredResources[].Id"),
                        List.of(
                                "alert.integration.volcengine.step.create_token",
                                "alert.integration.volcengine.step.configure_callback",
                                "alert.integration.volcengine.step.verify_lifecycle"),
                        List.of(DirectAlertIntegrationGuideContent.VOLCENGINE_METRIC_PAYLOAD),
                        READY,
                        List.of("alert.integration.limit.volcengine.event_recovery_unavailable"),
                        vendorTokenHeader("Token"))));
    }

    private static AlertIntegrationDescriptor descriptor(String ingressSource, IntegrationGuide guide) {
        return new AlertIntegrationDescriptor(ingressSource, guide);
    }

    private static IntegrationGuide guide(
            String source,
            String iconKey,
            String ingressPath,
            String payloadShape,
            List<String> requiredFields,
            List<String> steps,
            List<String> snippets,
            Readiness readiness,
            List<String> limitations) {
        return new IntegrationGuide(
                source,
                "alert.integration.source." + source,
                iconKey,
                "POST",
                ingressPath,
                payloadShape,
                bearerHeaders(),
                requiredFields,
                steps,
                snippets,
                ACKNOWLEDGEMENT,
                readiness,
                limitations);
    }

    private static IntegrationGuide guide(
            String source,
            String iconKey,
            String ingressPath,
            String payloadShape,
            List<String> requiredFields,
            List<String> steps,
            List<String> snippets,
            Readiness readiness,
            List<String> limitations,
            Map<String, String> requiredHeaders) {
        return new IntegrationGuide(
                source,
                "alert.integration.source." + source,
                iconKey,
                "POST",
                ingressPath,
                payloadShape,
                requiredHeaders,
                requiredFields,
                steps,
                snippets,
                ACKNOWLEDGEMENT,
                readiness,
                limitations);
    }

    private static Map<String, String> bearerHeaders() {
        LinkedHashMap<String, String> headers = new LinkedHashMap<>();
        headers.put("Authorization", "Bearer {token}");
        return headers;
    }

    private static Map<String, String> vendorTokenHeader(String headerName) {
        LinkedHashMap<String, String> headers = new LinkedHashMap<>();
        headers.put(headerName, "{token}");
        return headers;
    }
}
