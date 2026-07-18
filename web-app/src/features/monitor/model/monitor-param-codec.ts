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

import type { MonitorParamDefine } from '../api/monitor-api';
import {
  MonitorParamDraftError,
  type MonitorMetricField,
  type MonitorParamFormValue
} from './monitor-editor-model';

export function monitorParamFormValue(
  define: MonitorParamDefine,
  value: string | null | undefined
): MonitorParamFormValue {
  switch (define.type) {
    case 'boolean': return parseBooleanValue(value, define.field);
    case 'number': return parseNumberValue(value, define.field);
    case 'key-value': return parseStructuredValue(value, define.field);
    case 'metrics-field': return parseMetricsFields(value, define.field);
    case 'radio': return parseRadioValue(value, define);
    // Arrays remain comma-delimited strings because that is the backend wire contract.
    case 'array': return value ?? null;
    default: return value ?? null;
  }
}

export function serializeMonitorParamValue(define: MonitorParamDefine, value: unknown): string | null {
  switch (define.type) {
    case 'boolean': return serializeBooleanValue(value);
    case 'number': return serializeNumberValue(value);
    case 'key-value': return serializeMapValue(value);
    case 'metrics-field': return isMetricsFields(value) ? JSON.stringify(normalizeMetricsFields(value)) : null;
    default: return typeof value === 'string' ? value.trim() : null;
  }
}

export function numberDefineRange(define: MonitorParamDefine) {
  if (define.range === null) return null;
  const match = /^\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]$/.exec(define.range.replace(/\s+/g, ''));
  if (!match) throw new MonitorParamDraftError(define.field);
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) throw new MonitorParamDraftError(define.field);
  return { min, max };
}

function parseBooleanValue(value: string | null | undefined, field: string) {
  if (value?.toLowerCase() === 'true') return true;
  if (value?.toLowerCase() === 'false') return false;
  // Existing null is ambiguous evidence; only a newly created boolean may default to false.
  throw new MonitorParamDraftError(field);
}

function parseNumberValue(value: string | null | undefined, field: string) {
  if (value == null || !value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new MonitorParamDraftError(field);
  return parsed;
}

function parseRadioValue(value: string | null | undefined, define: MonitorParamDefine) {
  if (value == null || value === '') return value ?? null;
  // Spring enum-like options use equals-ignore-case but the form keeps the canonical option value.
  const option = define.options?.find(item => item.value.toLowerCase() === value.toLowerCase());
  if (!option) throw new MonitorParamDraftError(define.field);
  return option.value;
}

function serializeBooleanValue(value: unknown) {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) return value.toLowerCase();
  return null;
}

function serializeNumberValue(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Number(value))) return null;
  return String(Number(value));
}

function serializeMapValue(value: unknown) {
  if (value === '') return '';
  return isStringRecord(value) ? JSON.stringify(value) : null;
}

function parseStructuredValue(value: string | null | undefined, field: string) {
  if (value == null) return null;
  if (value === '') return '';
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isStringRecord(parsed)) throw new MonitorParamDraftError(field);
    return parsed;
  } catch {
    throw new MonitorParamDraftError(field);
  }
}

function parseMetricsFields(value: string | null | undefined, field: string): MonitorMetricField[] | null {
  if (value == null || value === '') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isMetricsFields(parsed)) throw new MonitorParamDraftError(field);
    return parsed;
  } catch {
    throw new MonitorParamDraftError(field);
  }
}

function isMetricsFields(value: unknown): value is MonitorMetricField[] {
  const allowed = new Set(['field', 'unit', 'type', 'label', 'i18n']);
  if (!Array.isArray(value)) return false;
  const fields = value.map(entry => isUnknownRecord(entry) && typeof entry.field === 'string' ? entry.field.trim() : '');
  return fields.every(Boolean) && new Set(fields).size === fields.length && value.every(entry => {
    if (!isUnknownRecord(entry) || Object.keys(entry).some(key => !allowed.has(key))) return false;
    return typeof entry.field === 'string' && typeof entry.unit === 'string' && entry.unit.trim().length > 0
      && (entry.type === 0 || entry.type === 1)
      && (entry.label === undefined || typeof entry.label === 'boolean')
      && (entry.i18n === undefined || isStringRecord(entry.i18n));
  });
}

function normalizeMetricsFields(value: MonitorMetricField[]) {
  return value.map(entry => ({ ...entry, field: entry.field.trim(), unit: entry.unit.trim() }));
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.entries(value).every(([key, entry]) => key.trim().length > 0 && typeof entry === 'string');
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
