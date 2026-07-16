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

import type { Monitor, MonitorParam, MonitorParamDefine } from '../api/monitor-api';

function paramType(type?: string) {
  if (type === 'number') return 0;
  if (type === 'key-value') return 3;
  if (type === 'array') return 4;
  return 1;
}

function defaultValue(define: MonitorParamDefine) {
  if (define.type === 'number') return define.defaultValue ? Number(define.defaultValue) : null;
  if (define.type === 'boolean') return define.defaultValue?.toLowerCase() === 'true';
  return define.defaultValue ?? '';
}

export function buildMonitorParams(defines: MonitorParamDefine[], existing: MonitorParam[] = []) {
  const values = new Map(existing.map(param => [param.field, param]));
  return defines.map(define => values.get(define.field) ?? {
    field: define.field,
    type: paramType(define.type),
    paramValue: defaultValue(define)
  });
}

export function validateMonitorDraft(monitor: Partial<Monitor>, defines: MonitorParamDefine[], params: MonitorParam[]) {
  const issues: string[] = [];
  if (!monitor.app?.trim()) issues.push('app');
  if (!monitor.name?.trim()) issues.push('name');
  const values = new Map(params.map(param => [param.field, param.paramValue]));
  defines.filter(define => define.required && !define.hide).forEach(define => {
    const value = values.get(define.field);
    if (value == null || (typeof value === 'string' && !value.trim())) issues.push(`param:${define.field}`);
  });
  return issues;
}

export function buildMonitorPayload(monitor: Partial<Monitor>, collector: string, params: MonitorParam[]) {
  const host = params.find(param => param.field === 'host')?.paramValue;
  return {
    monitor: {
      ...monitor,
      name: monitor.name?.trim(),
      instance: typeof host === 'string' && host.trim() ? host.trim() : monitor.instance
    },
    collector: collector.trim() || null,
    params,
    grafanaDashboard: { enabled: false }
  };
}
