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

import { serializeCsv, type BrowserDownloadArtifact } from '@/shared/browser-download';

import { alertGroupName, type AlertGroup, type AlertRecord } from './alert-model';

const csvHeaders = [
  'group_id',
  'group_name',
  'group_status',
  'severity',
  'updated_at_server_local',
  'summary',
  'alert_count',
  'alert_id',
  'alert_status',
  'content',
  'trigger_times',
  'start_at_epoch_ms',
  'active_at_epoch_ms',
  'end_at_epoch_ms',
  'group_labels',
  'common_labels',
  'common_annotations',
  'alert_labels',
  'alert_annotations'
] as const;

type CsvValue = string | number | null | undefined;

export function buildAlertCenterCsvArtifact(
  groups: readonly AlertGroup[],
  generatedAt = new Date()
): BrowserDownloadArtifact {
  const date = generatedAt.toISOString().slice(0, 10);
  return {
    data: new Blob(['\uFEFF', serializeAlertGroupsCsv(groups)], { type: 'text/csv;charset=utf-8' }),
    filename: `hertzbeat-alerts-${date}.csv`
  };
}

export function serializeAlertGroupsCsv(groups: readonly AlertGroup[]) {
  const rows = groups.flatMap(group => {
    const alerts: Array<AlertRecord | null> = group.alerts.length > 0 ? group.alerts : [null];
    return alerts.map(alert => alertCsvRow(group, alert));
  });
  return serializeCsv([csvHeaders, ...rows]);
}

function alertCsvRow(group: AlertGroup, alert: AlertRecord | null): CsvValue[] {
  return [
    ...groupCsvFields(group),
    group.alerts.length,
    ...alertCsvFields(alert),
    stableJson(group.groupLabels),
    stableJson(group.commonLabels),
    stableJson(group.commonAnnotations),
    stableJson(alert?.labels),
    stableJson(alert?.annotations)
  ];
}

function groupCsvFields(group: AlertGroup): CsvValue[] {
  return [
    group.id,
    alertGroupName(group),
    group.status,
    group.commonLabels?.severity,
    group.gmtUpdate,
    group.commonAnnotations?.summary ?? group.commonAnnotations?.description
  ];
}

function alertCsvFields(alert: AlertRecord | null): CsvValue[] {
  if (!alert) return ['', '', '', '', '', '', ''];
  return [alert.id, alert.status, alert.content, alert.triggerTimes, alert.startAt, alert.activeAt, alert.endAt];
}

function stableJson(value: Record<string, string> | null | undefined) {
  if (!value) return '';
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))));
}
