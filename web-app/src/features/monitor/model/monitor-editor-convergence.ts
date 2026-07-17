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

import type { MonitorDetail, MonitorParam, MonitorParamDefine } from '../api/monitor-api';
import type { MonitorMutationPayload } from './monitor-editor-model';

const monitorWritableKeys = [
  'name', 'app', 'scrape', 'intervals', 'scheduleType', 'cronExpression', 'labels', 'annotations', 'description'
] as const;

export function monitorWritableConverged(mode: 'new' | 'edit', payload: MonitorMutationPayload, detail: MonitorDetail,
  defines: MonitorParamDefine[] = [], before?: MonitorDetail) {
  return sameMonitor(payload, detail)
    && (payload.collector ?? null) === (detail.collector ?? null)
    && sameParams(payload.params, detail.params ?? [], mode, defines, before?.params ?? [])
    && sameGrafana(payload, detail);
}

function sameMonitor(payload: MonitorMutationPayload, detail: MonitorDetail) {
  return monitorWritableKeys.every(key => sameValue(payload.monitor[key], detail.monitor[key]))
    && detail.monitor.instance === payload.monitor.instance;
}

function sameGrafana(payload: MonitorMutationPayload, detail: MonitorDetail) {
  return payload.grafanaDashboard.enabled === (detail.grafanaDashboard?.enabled ?? false)
    && (payload.grafanaDashboard.template ?? null) === (detail.grafanaDashboard?.template ?? null);
}

function sameParams(left: MonitorMutationPayload['params'], right: MonitorParam[], mode: 'new' | 'edit',
  defines: MonitorParamDefine[], before: MonitorParam[]) {
  if (left.length !== right.length) return false;
  const byField = new Map(right.map(param => [param.field, param]));
  return left.every(param => {
    const current = byField.get(param.field);
    const define = defines.find(item => item.field === param.field);
    const previous = before.find(item => item.field === param.field);
    return current !== undefined && param.type === current.type
      && (define?.type === 'password'
        ? passwordValueConverged(param.paramValue, current.paramValue, previous?.paramValue)
        : sameParamValue(param.type, param.paramValue, current.paramValue))
      && (mode === 'new' || (param.id ?? null) === (current.id ?? null));
  });
}

function passwordValueConverged(submitted: string | null | undefined, actual: string | null | undefined,
  previous: string | null | undefined) {
  const submittedUnconfigured = submitted === null || submitted === undefined;
  const actualUnconfigured = actual === null || actual === undefined;
  if (submittedUnconfigured || actualUnconfigured) return submittedUnconfigured && actualUnconfigured;
  if (!submitted || !actual) return false;
  if (submitted === previous && previous !== undefined) return actual === submitted;
  return actual !== submitted && looksLikeAesCiphertext(actual);
}

function looksLikeAesCiphertext(value: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
  try {
    const size = atob(value).length;
    return size > 0 && size % 16 === 0;
  } catch {
    return false;
  }
}

function sameParamValue(type: number | undefined, left: string | null | undefined, right: string | null | undefined) {
  if (type !== 3) return (left ?? null) === (right ?? null);
  return sameValue(parseJsonRecord(left), parseJsonRecord(right));
}

function parseJsonRecord(value: string | null | undefined) {
  if (value == null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isStringRecord(parsed) ? parsed : value;
  } catch {
    return value;
  }
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === undefined && right == null || left == null && right === undefined) return true;
  if (isUnknownRecord(left) && isUnknownRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length
      && leftKeys.every(key => Object.hasOwn(right, key) && sameValue(left[key], right[key]));
  }
  return left === right;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isUnknownRecord(value)
    && Object.entries(value).every(([key, entry]) => key.trim().length > 0 && typeof entry === 'string');
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
