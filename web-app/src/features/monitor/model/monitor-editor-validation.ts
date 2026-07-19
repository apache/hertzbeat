/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Monitor, MonitorParamDefine } from './monitor-contract';
import { isMonitorParamVisible } from './monitor-editor-draft';
import type { MonitorEditorDraft, MonitorParamDraft, MonitorParamFormValue } from './monitor-editor-model';
import { numberDefineRange } from './monitor-param-codec';

export function validateMonitorDraft(
  monitor: Partial<Monitor>,
  defines: MonitorParamDefine[],
  params: MonitorParamDraft[]
) {
  const issues: string[] = [];
  if (!monitor.app?.trim()) issues.push('app');
  if (!monitor.name?.trim()) issues.push('name');
  if (monitor.scheduleType === 'cron') {
    if (!isValidCronExpression(monitor.cronExpression)) issues.push('cronExpression');
  } else if (!validMonitorInterval(monitor.app, monitor.intervals)) {
    issues.push('intervals');
  }
  const values = new Map(params.map(param => [param.field, param.paramValue]));
  defines
    .filter(define => isMonitorParamVisible(define, params))
    .forEach(define => {
      if (!isValidParamValue(define, values.get(define.field))) issues.push(`param:${define.field}`);
    });
  return issues;
}

export function validateMonitorEditorDraft(draft: MonitorEditorDraft, defines: MonitorParamDefine[]) {
  return [
    ...validateMonitorDraft(draft.monitor, defines, draft.params),
    ...draft.invalidParamFields
      .filter(
        field =>
          field.startsWith('__') ||
          defines.some(define => define.field === field && isMonitorParamVisible(define, draft.params))
      )
      .map(field => `param:${field}`)
  ];
}

export function monitorIntervalBounds(app: string | undefined) {
  return { min: app === 'push' ? 1 : 10, max: 604_800, step: app === 'push' ? 1 : 10 };
}

export function isValidCronExpression(value: string | null | undefined) {
  const fields = value?.trim().split(/\s+/) ?? [];
  // Spring's CronExpression is the execution authority. The browser only prevents incomplete schedules.
  return fields.length === 6 && fields.every(Boolean);
}

function isValidParamValue(define: MonitorParamDefine, value: MonitorParamFormValue | undefined) {
  const empty =
    value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0);
  if (empty) return !define.required;
  if (define.type === 'number' && typeof value === 'number') return numberWithinDefineRange(define, value);
  if ((define.type === 'text' || define.type === 'textarea') && typeof value === 'string' && define.limit !== null) {
    return value.length <= define.limit;
  }
  return true;
}

function validMonitorInterval(app: string | undefined, value: number | null | undefined) {
  const bounds = monitorIntervalBounds(app);
  return (
    Number.isSafeInteger(value) && value !== null && value !== undefined && value >= bounds.min && value <= bounds.max
  );
}

function numberWithinDefineRange(define: MonitorParamDefine, value: number) {
  const range = numberDefineRange(define);
  return range === null || (value >= range.min && value <= range.max);
}
