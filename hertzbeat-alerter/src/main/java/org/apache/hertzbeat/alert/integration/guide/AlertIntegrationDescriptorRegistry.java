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

import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness.CONFIGURATION_REQUIRED;
import static org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.Readiness.GUIDE_BLOCKED;
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
    private static final String AUTHORIZATION_REQUIRED =
            "alert.integration.limit.bearer_configuration_required";

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
                descriptor("skywalking", constrainedGuide(
                        "skywalking",
                        "skywalking",
                        "skywalking_alert_array",
                        List.of("[].alarmMessage", "[].startTime", "[].tags"),
                        CONFIGURATION_REQUIRED)),
                descriptor("uptime-kuma", constrainedGuide(
                        "uptime-kuma",
                        "uptime-kuma",
                        "uptime_kuma_webhook",
                        List.of("heartbeat.status", "heartbeat.time", "monitor.id", "monitor.name"),
                        CONFIGURATION_REQUIRED)),
                descriptor("zabbix", guide(
                        "zabbix",
                        "zabbix",
                        "/api/alerts/report/zabbix",
                        "single_alert",
                        List.of("labels", "content", "status", "startAt"),
                        List.of("alert.integration.zabbix.step.correct_guide_required"),
                        List.of(),
                        GUIDE_BLOCKED,
                        List.of(
                                "alert.integration.limit.zabbix.authorization_missing",
                                "alert.integration.limit.zabbix.response_contract_mismatch",
                                "alert.integration.limit.zabbix.recovery_time_semantics"))),
                descriptor("tencent", constrainedGuide(
                        "tencent",
                        "tencent",
                        "tencent_cloud_webhook",
                        List.of(
                                "alarmStatus",
                                "alarmType",
                                "firstOccurTime",
                                "alarmObjInfo",
                                "alarmPolicyInfo.conditions"),
                        CONFIGURATION_REQUIRED)),
                descriptor("alibabacloud-sls", constrainedGuide(
                        "alibabacloud-sls",
                        "alibabacloud",
                        "alibaba_cloud_sls_webhook",
                        List.of("alert_name", "status", "fire_time", "alert_time", "region", "project"),
                        CONFIGURATION_REQUIRED)),
                descriptor("huaweicloud-ces", constrainedGuide(
                        "huaweicloud-ces",
                        "huaweicloud",
                        "huawei_cloud_smn_webhook",
                        List.of(
                                "signature",
                                "signing_cert_url",
                                "type",
                                "message",
                                "timestamp",
                                "topic_urn"),
                        CONFIGURATION_REQUIRED)),
                descriptor("volcengine", constrainedGuide(
                        "volcengine",
                        "volcengine",
                        "volcengine_webhook",
                        List.of("Type"),
                        CONFIGURATION_REQUIRED)));
    }

    private static AlertIntegrationDescriptor descriptor(String ingressSource, IntegrationGuide guide) {
        return new AlertIntegrationDescriptor(ingressSource, guide);
    }

    private static IntegrationGuide constrainedGuide(
            String source,
            String iconKey,
            String payloadShape,
            List<String> requiredFields,
            Readiness readiness) {
        return guide(
                source,
                iconKey,
                "/api/alerts/report/" + source,
                payloadShape,
                requiredFields,
                List.of("alert.integration.step.configure_bearer_capable_callback"),
                List.of(),
                readiness,
                List.of(AUTHORIZATION_REQUIRED));
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
                requiredHeaders(),
                requiredFields,
                steps,
                snippets,
                ACKNOWLEDGEMENT,
                readiness,
                limitations);
    }

    private static Map<String, String> requiredHeaders() {
        LinkedHashMap<String, String> headers = new LinkedHashMap<>();
        headers.put("Authorization", "Bearer {token}");
        return headers;
    }
}
