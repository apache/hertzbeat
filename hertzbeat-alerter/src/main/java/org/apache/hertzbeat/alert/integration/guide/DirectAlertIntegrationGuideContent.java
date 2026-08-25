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

/**
 * Source-owned examples for directly supported external alert senders.
 */
final class DirectAlertIntegrationGuideContent {

    static final String SKYWALKING_WEBHOOK = """
            hooks:
              webhook:
                hertzbeat:
                  urls:
                    - https://<hertzbeat-host>/api/alerts/report/skywalking
                  recovery-urls:
                    - https://<hertzbeat-host>/api/alerts/report/skywalking
                  headers:
                    Authorization: Bearer {token}
            """;

    static final String UPTIME_KUMA_WEBHOOK = """
            {
              "httpMethod": "post",
              "webhookContentType": "json",
              "webhookAdditionalHeaders": "{\\\"Authorization\\\":\\\"Bearer {token}\\\"}"
            }
            """;

    static final String TENCENT_WEBHOOK_PAYLOAD = """
            {
              "alarmStatus": "1",
              "alarmType": "metric",
              "firstOccurTime": "2026-01-01 00:00:00",
              "recoverTime": "",
              "alarmObjInfo": {
                "region": "ap-guangzhou",
                "namespace": "QCE/CVM",
                "appID": "123456",
                "uin": "100000000001",
                "dimensions": {"unInstanceID": "ins-example", "objID": "ins-example"}
              },
              "alarmPolicyInfo": {
                "policyID": "policy-example",
                "policyType": "metric",
                "policyName": "CPU usage",
                "conditions": {"metricName": "CPUUsage", "metricShowName": "CPU usage"}
              }
            }
            """;

    static final String ALIBABA_SLS_WEBHOOK_PAYLOAD = """
            {
              "alert_name": "HighErrorRate",
              "alert_id": "alert-example",
              "alert_instance_id": "instance-example",
              "status": "firing",
              "fire_time": 1767225600,
              "alert_time": 1767225600,
              "region": "cn-hangzhou",
              "project": "example-project",
              "labels": {"service": "checkout"}
            }
            """;

    static final String VOLCENGINE_METRIC_PAYLOAD = """
            {
              "Type": "MetricRecovered",
              "RuleName": "HighCPUUsage",
              "RuleId": "rule-example",
              "Namespace": "VCM_ECS",
              "HappenedAt": "2026-01-01 00:05:00+08:00",
              "RecoveredResources": [
                {
                  "Id": "instance-example",
                  "Name": "example-instance",
                  "Region": "cn-beijing",
                  "FirstAlertTime": 1767196800,
                  "LastAlertTime": 1767197100,
                  "Metrics": [],
                  "Dimensions": []
                }
              ]
            }
            """;

    private DirectAlertIntegrationGuideContent() {
    }
}
