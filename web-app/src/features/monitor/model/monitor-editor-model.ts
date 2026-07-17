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

import type {
  Monitor, MonitorDetail, MonitorGrafanaDashboard, MonitorParam, MonitorParamDefine, MonitorScrape
} from '../api/monitor-api';

export type MonitorMetricField = {
  field: string;
  unit: string;
  type: 0 | 1;
  label?: boolean;
  i18n?: Record<string, string>;
};
export type MonitorParamFormValue = string | number | boolean | Record<string, string> | MonitorMetricField[] | null;
export type MonitorParamDraft = Omit<MonitorParam, 'paramValue'> & { paramValue: MonitorParamFormValue };
export type MonitorEditorDraft = {
  monitor: Monitor;
  collector: string;
  params: MonitorParamDraft[];
  grafanaDashboard: MonitorGrafanaDashboard;
  invalidParamFields: string[];
};

export class MonitorParamDraftError extends Error {
  constructor(readonly field: string) {
    super(`Monitor parameter ${field} cannot be represented safely`);
    this.name = 'MonitorParamDraftError';
  }
}

function paramType(type?: string) {
  if (type === 'number') return 0;
  if (type === 'key-value') return 3;
  if (type === 'array') return 4;
  return 1;
}

function defaultValue(define: MonitorParamDefine) {
  if (define.type === 'boolean' && define.defaultValue === null) return false;
  return monitorParamFormValue(define, define.defaultValue);
}

export function monitorParamFormValue(define: MonitorParamDefine, value: string | null | undefined): MonitorParamFormValue {
  switch (define.type) {
    case 'boolean': return parseBooleanValue(value, define.field);
    case 'number': return parseNumberValue(value, define.field);
    case 'key-value': return parseStructuredValue(value, define.field);
    case 'metrics-field': return parseMetricsFields(value, define.field);
    case 'radio': return parseRadioValue(value, define);
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

function parseBooleanValue(value: string | null | undefined, field: string) {
  if (value?.toLowerCase() === 'true') return true;
  if (value?.toLowerCase() === 'false') return false;
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

export function isMonitorParamVisible(define: MonitorParamDefine, params: MonitorParamDraft[]) {
  if (!define.depend) return true;
  const values = new Map(params.map(param => [param.field, param.paramValue]));
  return Object.entries(define.depend).every(([field, accepted]) => {
    const current = dependencyScalar(values.get(field));
    return current !== undefined && accepted.some(value => dependencyScalar(value) === current);
  });
}

function dependencyScalar(value: unknown) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : undefined;
}

export function groupMonitorParamDefines(defines: MonitorParamDefine[]) {
  return {
    basic: defines.filter(define => !define.hide),
    advanced: defines.filter(define => define.hide)
  };
}

export function buildMonitorParams(defines: MonitorParamDefine[], existing: MonitorParam[] = []): MonitorParamDraft[] {
  const values = new Map(existing.map(param => [param.field, param]));
  return defines.map(define => {
    const current = values.get(define.field);
    return current ? { ...current, paramValue: monitorParamFormValue(define, current.paramValue) } : {
      field: define.field,
      type: paramType(define.type),
      paramValue: defaultValue(define)
    };
  });
}

export function createMonitorEditorDraft(detail: MonitorDetail | undefined, app: string,
  scrape: MonitorScrape, defines: MonitorParamDefine[]): MonitorEditorDraft {
  const supportedTypes = new Set(['text', 'number', 'host', 'password', 'boolean', 'radio', 'textarea',
    'key-value', 'array', 'metrics-field']);
  defines.forEach(define => {
    if (!supportedTypes.has(define.type)) throw new MonitorParamDraftError(define.field);
    if (define.type === 'number') numberDefineRange(define);
  });
  const existing = detail?.params ?? [];
  if (detail && existing.some(param => !defines.some(define => define.field === param.field))) {
    throw new MonitorParamDraftError(existing.find(param => !defines.some(define => define.field === param.field))!.field);
  }
  return {
    monitor: detail ? normalizeMonitorSchedule(detail.monitor) : { id: 0, app, name: '', instance: '', status: 0, type: 0,
      intervals: 60, scheduleType: 'interval', cronExpression: null, scrape },
    collector: detail?.collector ?? '',
    params: buildMonitorParams(defines, existing),
    grafanaDashboard: detail?.grafanaDashboard ?? {
      monitorId: null, folderUid: null, slug: null, status: null, uid: null, url: null, version: null,
      enabled: false, template: null
    },
    invalidParamFields: []
  };
}

function normalizeMonitorSchedule(monitor: Monitor): Monitor {
  const scheduleType = monitor.scheduleType ?? 'interval';
  const intervals = scheduleType === 'interval' ? monitor.intervals ?? 60 : monitor.intervals;
  return { ...monitor, scheduleType, ...(intervals === undefined ? {} : { intervals }) };
}

export function transitionMonitorEditorDraft(draft: MonitorEditorDraft, previousDefines: MonitorParamDefine[],
  nextDefines: MonitorParamDefine[], scrape: MonitorScrape): MonitorEditorDraft {
  const previous = new Map(previousDefines.map(define => [define.field, define]));
  const current = new Map(draft.params.map(param => [param.field, param]));
  const defaults = buildMonitorParams(nextDefines);
  const params = defaults.map(param => {
    const nextDefine = nextDefines.find(define => define.field === param.field)!;
    const previousDefine = previous.get(param.field);
    const existing = current.get(param.field);
    return previousDefine?.app === nextDefine.app && existing ? existing : param;
  });
  const instance = monitorInstanceForScrapeTransition(scrape);
  return { ...draft, monitor: { ...draft.monitor, scrape, instance }, params,
    invalidParamFields: draft.invalidParamFields.filter(field => nextDefines.some(define => define.field === field)) };
}

export function monitorInstanceForScrapeTransition(scrape: MonitorScrape) {
  return scrape === 'static' ? '' : 'unknow';
}

export function validateMonitorDraft(monitor: Partial<Monitor>, defines: MonitorParamDefine[], params: MonitorParamDraft[]) {
  const issues: string[] = [];
  if (!monitor.app?.trim()) issues.push('app');
  if (!monitor.name?.trim()) issues.push('name');
  if (monitor.scheduleType === 'cron') {
    if (!isValidCronExpression(monitor.cronExpression)) issues.push('cronExpression');
  } else if (!validMonitorInterval(monitor.app, monitor.intervals)) {
    issues.push('intervals');
  }
  const values = new Map(params.map(param => [param.field, param.paramValue]));
  defines.filter(define => isMonitorParamVisible(define, params)).forEach(define => {
    if (!isValidParamValue(define, values.get(define.field))) issues.push(`param:${define.field}`);
  });
  return issues;
}

function isValidParamValue(define: MonitorParamDefine, value: MonitorParamFormValue | undefined) {
  const empty = value == null || typeof value === 'string' && !value.trim() || Array.isArray(value) && value.length === 0;
  if (empty) return !define.required;
  if (define.type === 'number' && typeof value === 'number') return numberWithinDefineRange(define, value);
  if ((define.type === 'text' || define.type === 'textarea') && typeof value === 'string' && define.limit !== null) {
    return value.length <= define.limit;
  }
  return true;
}

export function validateMonitorEditorDraft(draft: MonitorEditorDraft, defines: MonitorParamDefine[]) {
  return [...validateMonitorDraft(draft.monitor, defines, draft.params),
    ...draft.invalidParamFields.filter(field => field.startsWith('__') || defines.some(define =>
      define.field === field && isMonitorParamVisible(define, draft.params))).map(field => `param:${field}`)];
}

export function monitorIntervalBounds(app: string | undefined) {
  return { min: app === 'push' ? 1 : 10, max: 604_800, step: app === 'push' ? 1 : 10 };
}

function validMonitorInterval(app: string | undefined, value: number | null | undefined) {
  const bounds = monitorIntervalBounds(app);
  return Number.isSafeInteger(value) && value !== null && value !== undefined
    && value >= bounds.min && value <= bounds.max;
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

function numberWithinDefineRange(define: MonitorParamDefine, value: number) {
  const range = numberDefineRange(define);
  return range === null || value >= range.min && value <= range.max;
}

export function isValidCronExpression(value: string | null | undefined) {
  const fields = value?.trim().split(/\s+/) ?? [];
  // Spring's CronExpression is the execution authority. The browser only prevents incomplete schedules.
  return fields.length === 6 && fields.every(Boolean);
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

export function buildMonitorPayload(monitor: Partial<Monitor>, collector: string, params: MonitorParamDraft[],
  defines: MonitorParamDefine[] = [], grafanaDashboard?: MonitorGrafanaDashboard | null) {
  const defineMap = new Map(defines.map(define => [define.field, define]));
  const serializedParams = params.map(param => {
    const define = defineMap.get(param.field);
    return { ...param, paramValue: serializeParamDraft(param, define) };
  });
  const host = serializedParams.find(param => param.field === 'host')?.paramValue;
  const port = serializedParams.find(param => param.field === 'port')?.paramValue;
  return {
    monitor: {
      ...monitor,
      name: monitor.name?.trim(),
      labels: monitor.labels ?? {},
      annotations: monitor.annotations ?? {},
      instance: derivedMonitorInstance(monitor.scrape, host, port)
    },
    collector: collector.trim() || null,
    params: serializedParams,
    grafanaDashboard: grafanaDashboard ?? {
      monitorId: null, folderUid: null, slug: null, status: null, uid: null, url: null, version: null,
      enabled: false, template: null
    }
  };
}

function derivedMonitorInstance(scrape: string | null | undefined, host: string | null | undefined,
  port: string | null | undefined) {
  if (scrape && scrape !== 'static') return 'unknow';
  const normalizedHost = host?.trim() ?? '';
  const normalizedPort = port?.trim() ?? '';
  if (!normalizedHost || !normalizedPort) return normalizedHost;
  return appendAuthorityPort(normalizedHost, normalizedPort);
}

function appendAuthorityPort(host: string, port: string) {
  const uri = /^([a-z][a-z0-9+.-]*:\/\/)(\[[^\]]+\]|[^/:?#]+)(:\d+)?(.*)$/i.exec(host);
  if (uri) return uri[3] ? host : `${uri[1]}${uri[2]}:${port}${uri[4]}`;
  const bracketedIpv6 = /^(\[[^\]]+\])(?::\d+)?$/.exec(host);
  if (bracketedIpv6) return /\]:\d+$/.test(host) ? host : `${bracketedIpv6[1]}:${port}`;
  if ((host.match(/:/g)?.length ?? 0) > 1) return `[${host}]:${port}`;
  return /:\d+$/.test(host) ? host : `${host}:${port}`;
}

function serializeParamDraft(param: MonitorParamDraft, define: MonitorParamDefine | undefined): string | null {
  if (define) return serializeMonitorParamValue(define, param.paramValue);
  if (param.paramValue === null || typeof param.paramValue === 'string') return param.paramValue;
  throw new MonitorParamDraftError(param.field);
}

export type MonitorMutationPayload = ReturnType<typeof buildMonitorPayload>;

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
