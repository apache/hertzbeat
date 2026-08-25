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
 * Maintained Zabbix media-type configuration rendered by the integration guide.
 */
final class ZabbixIntegrationGuideContent {

    static final String MEDIA_TYPE_PARAMETERS = """
            {
              "URL": "https://hertzbeat.example/api/alerts/report/zabbix",
              "Token": "{$HERTZBEAT_API_TOKEN}",
              "AlertName": "{EVENT.NAME}",
              "EventValue": "{EVENT.VALUE}",
              "EventTimestamp": "{EVENT.TIMESTAMP}",
              "EventRecoveryTimestamp": "{EVENT.RECOVERY.TIMESTAMP}",
              "TriggerId": "{TRIGGER.ID}",
              "TriggerDescription": "{TRIGGER.DESCRIPTION}",
              "EventSeverity": "{EVENT.NSEVERITY}",
              "HostId": "{HOST.ID}",
              "HostName": "{HOST.NAME}",
              "HostIp": "{HOST.IP}",
              "ItemName": "{ITEM.NAME}",
              "ItemValue": "{ITEM.VALUE}",
              "ItemLastValue": "{ITEM.LASTVALUE}"
            }""";

    static final String WEBHOOK_SCRIPT = """
            try {
              var params = JSON.parse(value),
                  request = new HttpRequest(),
                  response,
                  httpStatus;

              function requireParameter(name) {
                if (typeof params[name] !== 'string' || params[name].trim() === '') {
                  throw 'Missing required parameter: ' + name;
                }
                return params[name].trim();
              }

              function toMilliseconds(value, name) {
                var seconds = Number(value);
                if (!isFinite(seconds) || seconds <= 0) {
                  throw 'Invalid UNIX timestamp parameter: ' + name;
                }
                return seconds * 1000;
              }

              function normalizeSeverity(severity) {
                var severities = {
                  '0': 'info',
                  '1': 'info',
                  '2': 'warning',
                  '3': 'critical',
                  '4': 'critical',
                  '5': 'emergency'
                };
                return severities[severity] || 'critical';
              }

              var eventValue = requireParameter('EventValue'),
                  resolved = eventValue === '0',
                  startAt = toMilliseconds(requireParameter('EventTimestamp'), 'EventTimestamp'),
                  endAt = resolved
                    ? toMilliseconds(requireParameter('EventRecoveryTimestamp'), 'EventRecoveryTimestamp')
                    : null,
                  labels = {
                    alertname: requireParameter('AlertName'),
                    source: 'zabbix',
                    severity: normalizeSeverity(requireParameter('EventSeverity')),
                    zabbix_trigger_id: requireParameter('TriggerId'),
                    zabbix_host_id: requireParameter('HostId'),
                    host: requireParameter('HostName')
                  },
                  annotations = {
                    summary: params.AlertName,
                    description: params.TriggerDescription || '',
                    host_ip: params.HostIp || '',
                    item_name: params.ItemName || '',
                    item_value: params.ItemValue || '',
                    item_last_value: params.ItemLastValue || ''
                  },
                  payload = {
                    labels: labels,
                    annotations: annotations,
                    content: params.TriggerDescription || params.AlertName,
                    status: resolved ? 'resolved' : 'firing',
                    triggerTimes: 1,
                    startAt: startAt,
                    activeAt: startAt,
                    endAt: endAt
                  };

              request.addHeader('Content-Type: application/json');
              request.addHeader('Authorization: Bearer ' + requireParameter('Token'));
              response = request.post(requireParameter('URL'), JSON.stringify(payload));
              httpStatus = request.getStatus();

              if (httpStatus < 200 || httpStatus >= 300) {
                throw 'HertzBeat returned HTTP ' + httpStatus;
              }

              try {
                response = JSON.parse(response);
              } catch (error) {
                throw 'HertzBeat returned an invalid JSON response';
              }

              if (response.code !== 0) {
                throw response.msg || 'HertzBeat rejected the alert';
              }

              return 'OK';
            } catch (error) {
              Zabbix.log(3, '[HertzBeat webhook] Sending failed: ' + error);
              throw 'HertzBeat webhook failed: ' + error;
            }""";

    private ZabbixIntegrationGuideContent() {
    }
}
