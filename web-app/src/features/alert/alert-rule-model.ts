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

export const alertRulePageSizes = [8, 15, 25] as const;
export const alertRuleTypes = [
  'realtime_metric', 'periodic_metric', 'realtime_log', 'periodic_log', 'periodic_trace'
] as const;

export type AlertRuleQuery = { search: string; pageIndex: number; pageSize: number };
export type AlertRuleKind = 'realtime' | 'periodic';
export type AlertRuleDataType = 'metric' | 'log' | 'trace';
export type AlertRuleType = typeof alertRuleTypes[number];
export type AlertRuleDatasource = 'promql' | 'sql';

type AlertRuleWritableSnapshot = {
  type: AlertRuleType | null;
  datasource: AlertRuleDatasource | null;
  expr: string | null;
  period: number | null;
  times: number | null;
  labels: Record<string, string> | null;
  template: string | null;
};

export type AlertRuleDraft = {
  id?: number;
  name: string;
  kind: AlertRuleKind;
  dataType: AlertRuleDataType;
  expr: string;
  template: string;
  labelsText: string;
  annotations: Record<string, string> | null;
  enable: boolean;
  period: number | null;
  times: number | null;
  persisted?: AlertRuleWritableSnapshot;
};

export type AlertRule = {
  id: number;
  name: string;
  type: AlertRuleType | null;
  datasource: AlertRuleDatasource | null;
  expr: string | null;
  period: number | null;
  times: number | null;
  labels: Record<string, string> | null;
  annotations: Record<string, string> | null;
  template: string | null;
  enable: boolean;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type AlertRulePage = {
  content: AlertRule[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class AlertRuleContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlertRuleContractError';
  }
}

export class AlertRuleMissingError extends Error {
  constructor() {
    super('Alert Rule detail is missing');
    this.name = 'AlertRuleMissingError';
  }
}

export function parseAlertRuleDetail(value: unknown): AlertRule {
  if (value === null || value === undefined) throw new AlertRuleMissingError();
  const source = record(value, 'detail');
  const result: AlertRule = {
    id: positiveInteger(source.id, 'id'),
    name: boundedString(source.name, 'name', 100),
    type: nullableRuleType(source.type),
    datasource: nullableDatasource(source.datasource),
    expr: nullableBoundedText(source.expr, 'expr', 2048),
    period: nullablePositiveJavaInteger(source.period, 'period'),
    times: nullablePositiveJavaInteger(source.times, 'times'),
    labels: nullableStringMap(source.labels, 'labels'),
    annotations: nullableStringMap(source.annotations, 'annotations'),
    template: nullableBoundedText(source.template, 'template', 2048),
    enable: boolean(source.enable, 'enable')
  };
  copyAudit(source, result, 'creator');
  copyAudit(source, result, 'modifier');
  copyAudit(source, result, 'gmtCreate');
  copyAudit(source, result, 'gmtUpdate');
  return result;
}

export function parseAlertRulePage(value: unknown, query: AlertRuleQuery): AlertRulePage {
  const source = record(value, 'page');
  if (!Array.isArray(source.content)) throw contract('content must be an array');
  const totalElements = nonNegativeInteger(source.totalElements, 'totalElements');
  const totalPages = nonNegativeInteger(source.totalPages, 'totalPages');
  const number = nonNegativeInteger(source.number, 'number');
  const size = positiveInteger(source.size, 'size');
  if (number !== query.pageIndex || size !== query.pageSize) throw contract('page does not match the request');
  if (totalPages !== Math.ceil(totalElements / size)) throw contract('totalPages is inconsistent');
  const availableContent = Math.max(0, totalElements - number * size);
  if (source.content.length > Math.min(size, availableContent)) throw contract('page content is inconsistent');
  const content = (source.content as unknown[]).map(parseAlertRuleDetail);
  if (new Set(content.map(item => item.id)).size !== content.length) throw contract('duplicate ids are not allowed');
  return { content, totalElements, totalPages, number, size };
}

export function readAlertRuleQuery(params: URLSearchParams): AlertRuleQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: alertRulePageSizes.includes(pageSize as typeof alertRulePageSizes[number]) ? pageSize : 8
  };
}

export function writeAlertRuleQuery(query: AlertRuleQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export function buildAlertRuleListPath(query: AlertRuleQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex), pageSize: String(query.pageSize), sort: 'id', order: 'desc'
  });
  // Spring decodes the request parameter before the service deliberately URL-decodes it a second time.
  if (query.search.trim()) params.set('search', encodeURIComponent(JSON.stringify([query.search.trim()])));
  return `/api/alert/defines?${params.toString()}`;
}

export function createAlertRuleDraft(): AlertRuleDraft {
  return {
    name: '', kind: 'realtime', dataType: 'metric', expr: '', template: '', labelsText: '', annotations: {},
    enable: true, period: 300, times: 3
  };
}

export function buildAlertRulePayload(draft: AlertRuleDraft) {
  const invalid = validateAlertRuleDraft(draft);
  if (invalid.length > 0) throw contract(`invalid writable fields: ${invalid.join(',')}`);
  const selectedType = typeForDraft(draft);
  const type = preserveNullStrategy(draft, selectedType);
  return {
    ...(draft.id === undefined ? {} : { id: positiveInteger(draft.id, 'id') }),
    name: draft.name.trim(), type, datasource: resolveDatasource(draft, selectedType),
    expr: resolveNullableText(draft.expr, draft.persisted?.expr), period: draft.period, times: draft.times,
    labels: resolveLabels(draft), annotations: cloneNullableMap(draft.annotations),
    template: resolveNullableText(draft.template, draft.persisted?.template), enable: draft.enable
  };
}

export function buildAlertRuleTogglePayload(rule: AlertRule, enable: boolean) {
  return {
    id: rule.id, name: rule.name, type: rule.type, datasource: rule.datasource, expr: rule.expr,
    period: rule.period, times: rule.times, labels: cloneNullableMap(rule.labels),
    annotations: cloneNullableMap(rule.annotations), template: rule.template, enable
  };
}

export function buildAlertRulePreviewRequest(draft: AlertRuleDraft) {
  const type = typeForDraft(draft);
  if (!validBoundedText(draft.expr, 2048)) throw contract('expr is invalid');
  return { type, datasource: datasourceFor(type), expr: draft.expr.trim() };
}

export function validateAlertRuleDraft(draft: AlertRuleDraft) {
  const invalid: Array<'name' | 'type' | 'expr' | 'template' | 'labels' | 'annotations' | 'period' | 'times'> = [];
  if (!validBoundedText(draft.name, 100)) invalid.push('name');
  if (!validDraftType(draft)) invalid.push('type');
  if (!validWritableText(draft.expr, draft.persisted?.expr, 2048)) invalid.push('expr');
  if (!validWritableText(draft.template, draft.persisted?.template, 2048)) invalid.push('template');
  if (!tryParseLabels(draft.labelsText)) invalid.push('labels');
  if (!validNullableMap(draft.annotations)) invalid.push('annotations');
  if (draft.kind === 'periodic' ? !isPositiveJavaInteger(draft.period) : !isNullablePositiveJavaInteger(draft.period)) invalid.push('period');
  if (!isNullablePositiveJavaInteger(draft.times)) invalid.push('times');
  return invalid;
}

export function alertRuleDraftFromDetail(rule: AlertRule): AlertRuleDraft {
  const [kind, dataType] = (rule.type ?? 'realtime_metric').split('_') as [AlertRuleKind, AlertRuleDataType];
  return {
    id: rule.id, name: rule.name, kind, dataType, expr: rule.expr ?? '', template: rule.template ?? '',
    labelsText: Object.entries(rule.labels ?? {}).map(([key, value]) => `${key}:${value}`).join(', '),
    annotations: cloneNullableMap(rule.annotations), enable: rule.enable, period: rule.period, times: rule.times,
    persisted: {
      type: rule.type, datasource: rule.datasource, expr: rule.expr, period: rule.period, times: rule.times,
      labels: cloneNullableMap(rule.labels), template: rule.template
    }
  };
}

function typeForDraft(draft: AlertRuleDraft): AlertRuleType {
  const value = `${draft.kind}_${draft.dataType}`;
  if (!alertRuleTypes.includes(value as AlertRuleType)) throw contract('unsupported alert rule strategy');
  return value as AlertRuleType;
}

function datasourceFor(type: AlertRuleType): AlertRuleDatasource {
  return type === 'periodic_log' || type === 'periodic_trace' ? 'sql' : 'promql';
}

function preserveNullStrategy(draft: AlertRuleDraft, selected: AlertRuleType) {
  return draft.persisted?.type === null && selected === 'realtime_metric' ? null : selected;
}

function resolveDatasource(draft: AlertRuleDraft, selected: AlertRuleType) {
  const displayedOriginal = draft.persisted?.type ?? 'realtime_metric';
  if (draft.persisted && selected === displayedOriginal) return draft.persisted.datasource;
  return datasourceFor(selected);
}

function resolveNullableText(value: string, original: string | null | undefined) {
  return original === null && !value.trim() ? null : value.trim();
}

function validWritableText(value: string, original: string | null | undefined, max: number) {
  return original === null && !value.trim() || validBoundedText(value, max);
}

function resolveLabels(draft: AlertRuleDraft) {
  if (draft.persisted?.labels === null && !draft.labelsText.trim()) return null;
  return parseLabels(draft.labelsText);
}

function parseLabels(value: string) {
  const result: Record<string, string> = {};
  if (!value.trim()) return result;
  for (const item of value.split(',')) {
    const separator = item.indexOf(':');
    const key = item.slice(0, separator).trim();
    const labelValue = item.slice(separator + 1).trim();
    if (separator < 1 || !key || !labelValue || key in result) throw contract('labels must contain unique key:value entries');
    result[key] = labelValue;
  }
  return result;
}

function tryParseLabels(value: string) {
  try { parseLabels(value); return true; } catch { return false; }
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw contract(`${field} must be an object`);
  return value as Record<string, unknown>;
}

function nullableRuleType(value: unknown): AlertRuleType | null {
  if (value === null) return null;
  if (!alertRuleTypes.includes(value as AlertRuleType)) throw contract('type is unsupported');
  return value as AlertRuleType;
}

function nullableDatasource(value: unknown): AlertRuleDatasource | null {
  if (value === null) return null;
  if (value !== 'promql' && value !== 'sql') throw contract('datasource is unsupported');
  return value;
}

function boundedString(value: unknown, field: string, max: number) {
  if (typeof value !== 'string' || value.length > max) throw contract(`${field} is invalid`);
  return value;
}

function nullableBoundedText(value: unknown, field: string, max: number) {
  if (value === null) return null;
  return boundedString(value, field, max);
}

function validBoundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && Boolean(value.trim()) && value.length <= max;
}

function positiveInteger(value: unknown, field: string) {
  if (!isPositiveInteger(value)) throw contract(`${field} must be a positive integer`);
  return value;
}

function nullablePositiveJavaInteger(value: unknown, field: string) {
  if (value === null) return null;
  if (!isPositiveJavaInteger(value)) throw contract(`${field} must be a positive Java integer`);
  return value;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function isPositiveJavaInteger(value: unknown): value is number {
  return isPositiveInteger(value) && value <= 2_147_483_647;
}

function isNullablePositiveJavaInteger(value: unknown): value is number | null {
  return value === null || isPositiveJavaInteger(value);
}

function nonNegativeInteger(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw contract(`${field} must be a non-negative integer`);
  return value as number;
}

function nullableStringMap(value: unknown, field: string): Record<string, string> | null {
  if (value === null) return null;
  const source = record(value, field);
  if (!validNullableMap(source)) throw contract(`${field} must contain non-blank string entries`);
  return { ...source };
}

function validNullableMap(value: unknown): value is Record<string, string> | null {
  return value === null || Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.entries(value).every(([key, item]) => Boolean(key.trim()) && typeof item === 'string');
}

function cloneNullableMap(value: Record<string, string> | null) {
  return value === null ? null : { ...value };
}

function boolean(value: unknown, field: string) {
  if (typeof value !== 'boolean') throw contract(`${field} must be a boolean`);
  return value;
}

function copyAudit(source: Record<string, unknown>, target: AlertRule,
  field: 'creator' | 'modifier' | 'gmtCreate' | 'gmtUpdate') {
  if (!(field in source)) return;
  const value = source[field];
  if (value !== null && typeof value !== 'string') throw contract(`${field} must be a string or null`);
  if (field.startsWith('gmt') && typeof value === 'string' && !isLocalDateTime(value)) throw contract(`${field} is invalid`);
  target[field] = value;
}

function isLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
    && Number(match[4]) <= 23 && Number(match[5]) <= 59 && Number(match[6]) <= 59;
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function validDraftType(draft: AlertRuleDraft) {
  return (draft.kind === 'realtime' || draft.kind === 'periodic')
    && (draft.dataType === 'metric' || draft.dataType === 'log' || draft.dataType === 'trace')
    && !(draft.kind === 'realtime' && draft.dataType === 'trace');
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
