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

import { formatLabelMatchers, parseLabelMatchers } from './alert-label-matchers';

export const alertSilencePageSizes = [8, 15, 25] as const;

export type AlertSilenceQuery = { search: string; pageIndex: number; pageSize: number };
export type AlertSilenceType = 0 | 1;

export type AlertSilenceDraft = {
  id?: number;
  name: string;
  enable: boolean;
  matchAll: boolean;
  type: AlertSilenceType;
  labelsText: string;
  days: number[];
  periodStart: string;
  periodEnd: string;
};

export type AlertSilence = {
  id: number;
  name: string;
  enable: boolean;
  matchAll: boolean;
  type: AlertSilenceType;
  times: number | null;
  labels: Record<string, string> | null;
  days: number[] | null;
  periodStart: string | null;
  periodEnd: string | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type AlertSilencePage = {
  content: AlertSilence[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class AlertSilenceContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlertSilenceContractError';
  }
}

export class AlertSilenceMissingError extends Error {
  constructor() {
    super('Alert Silence detail is missing');
    this.name = 'AlertSilenceMissingError';
  }
}

export function parseAlertSilenceDetail(value: unknown): AlertSilence {
  if (value === null || value === undefined) throw new AlertSilenceMissingError();
  const source = record(value, 'detail');
  const result: AlertSilence = {
    id: positiveInteger(source.id, 'id'),
    name: nonBlankString(source.name, 'name'),
    enable: booleanValue(source.enable, 'enable'),
    matchAll: booleanValue(source.matchAll, 'matchAll'),
    type: silenceType(source.type),
    times: nullableNonNegativeInteger(source.times, 'times'),
    labels: nullableLabels(source.labels),
    days: nullableDays(source.days),
    periodStart: nullableOffsetDateTime(source.periodStart, 'periodStart'),
    periodEnd: nullableOffsetDateTime(source.periodEnd, 'periodEnd')
  };
  copyOptionalNullableString(source, result, 'creator');
  copyOptionalNullableString(source, result, 'modifier');
  copyOptionalNullableString(source, result, 'gmtCreate');
  copyOptionalNullableString(source, result, 'gmtUpdate');
  return result;
}

export function parseAlertSilencePage(value: unknown, query: AlertSilenceQuery): AlertSilencePage {
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
  const content = source.content.map(parseAlertSilenceDetail);
  if (new Set(content.map(item => item.id)).size !== content.length) throw contract('duplicate ids are not allowed');
  return { content, totalElements, totalPages, number, size };
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw contract(`${field} must be an object`);
  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw contract(`${field} must be a positive integer`);
  return value as number;
}

function nonNegativeInteger(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw contract(`${field} must be a non-negative integer`);
  return value as number;
}

function nonBlankString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw contract(`${field} must be a non-blank string`);
  return value;
}

function booleanValue(value: unknown, field: string) {
  if (typeof value !== 'boolean') throw contract(`${field} must be a boolean`);
  return value;
}

function silenceType(value: unknown): AlertSilenceType {
  if (value !== 0 && value !== 1) throw contract('type is unsupported');
  return value;
}

function nullableNonNegativeInteger(value: unknown, field: string) {
  return value === null ? null : nonNegativeInteger(value, field);
}

function nullableLabels(value: unknown): Record<string, string> | null {
  if (value === null) return null;
  const source = record(value, 'labels');
  const labels: Record<string, string> = {};
  for (const [key, item] of Object.entries(source)) {
    if (!key.trim() || typeof item !== 'string') throw contract('labels must contain string entries');
    labels[key] = item;
  }
  return labels;
}

function nullableDays(value: unknown): number[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) throw contract('days must be an array or null');
  const days = (value as unknown[]).map((item): number => {
    if (typeof item !== 'number' || !Number.isSafeInteger(item) || item < 1 || item > 7) {
      throw contract('day is outside the supported range');
    }
    return item;
  });
  if (new Set(days).size !== days.length) throw contract('days must be unique');
  return days;
}

function nullableOffsetDateTime(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (
    typeof value !== 'string'
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !Number.isFinite(Date.parse(value))
  ) {
    throw contract(`${field} must include an explicit offset`);
  }
  return value;
}

function copyOptionalNullableString(
  source: Record<string, unknown>,
  target: AlertSilence,
  field: 'creator' | 'modifier' | 'gmtCreate' | 'gmtUpdate'
) {
  if (!(field in source)) return;
  const value = source[field];
  if (value !== null && typeof value !== 'string') throw contract(`${field} must be a string or null`);
  target[field] = value;
}

function contract(message: string) {
  return new AlertSilenceContractError(message);
}

export function readAlertSilenceQuery(params: URLSearchParams): AlertSilenceQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: alertSilencePageSizes.includes(pageSize as typeof alertSilencePageSizes[number]) ? pageSize : 8
  };
}

export function writeAlertSilenceQuery(query: AlertSilenceQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export function buildAlertSilenceListPath(query: AlertSilenceQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize),
    sort: 'id',
    order: 'desc'
  });
  if (query.search) params.set('search', query.search);
  return `/api/alert/silences?${params.toString()}`;
}

function localDateTimeValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function timeValue(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function toIsoTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return '';
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toISOString();
}

export function createAlertSilenceDraft(): AlertSilenceDraft {
  const start = new Date();
  const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);
  return {
    name: '',
    enable: true,
    matchAll: true,
    type: 0,
    labelsText: '',
    days: [7, 1, 2, 3, 4, 5, 6],
    periodStart: localDateTimeValue(start),
    periodEnd: localDateTimeValue(end)
  };
}

function dateAtTime(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function changeAlertSilenceType(draft: AlertSilenceDraft, type: AlertSilenceType): AlertSilenceDraft {
  if (draft.type === type) return draft;
  if (type === 1) {
    return {
      ...draft,
      type,
      periodStart: draft.periodStart.includes('T') ? draft.periodStart.slice(11, 16) : draft.periodStart,
      periodEnd: draft.periodEnd.includes('T') ? draft.periodEnd.slice(11, 16) : draft.periodEnd
    };
  }
  const start = dateAtTime(draft.periodStart);
  const end = dateAtTime(draft.periodEnd);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { ...draft, type, periodStart: localDateTimeValue(start), periodEnd: localDateTimeValue(end) };
}

export function buildAlertSilencePayload(draft: AlertSilenceDraft) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    enable: draft.enable,
    matchAll: draft.matchAll,
    type: draft.type,
    labels: draft.matchAll ? {} : (parseLabelMatchers(draft.labelsText) ?? {}),
    days: draft.type === 1 ? [...new Set(draft.days)] : [],
    periodStart: draft.type === 0 ? toIsoDateTime(draft.periodStart) : toIsoTime(draft.periodStart),
    periodEnd: draft.type === 0 ? toIsoDateTime(draft.periodEnd) : toIsoTime(draft.periodEnd)
  };
}

export function buildAlertSilenceTogglePayload(silence: AlertSilence, enable: boolean) {
  return {
    id: silence.id,
    name: silence.name,
    enable,
    matchAll: silence.matchAll,
    type: silence.type,
    labels: silence.labels,
    days: silence.days,
    periodStart: silence.periodStart,
    periodEnd: silence.periodEnd
  };
}

export function validateAlertSilenceDraft(draft: AlertSilenceDraft) {
  const invalid: Array<'name' | 'labels' | 'days' | 'period'> = [];
  if (!draft.name.trim()) invalid.push('name');
  if (!draft.matchAll && !parseLabelMatchers(draft.labelsText)) invalid.push('labels');
  if (draft.type === 1 && draft.days.length === 0) invalid.push('days');
  if (draft.type === 0) {
    const start = Date.parse(draft.periodStart);
    const end = Date.parse(draft.periodEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) invalid.push('period');
  } else if (!toIsoTime(draft.periodStart) || !toIsoTime(draft.periodEnd)) {
    invalid.push('period');
  }
  return invalid;
}

export function alertSilenceDraftFromDetail(silence: AlertSilence): AlertSilenceDraft {
  const type = silence.type;
  const start = silence.periodStart ? new Date(silence.periodStart) : new Date();
  const end = silence.periodEnd ? new Date(silence.periodEnd) : new Date(start.getTime() + 6 * 60 * 60 * 1000);
  return {
    id: silence.id,
    name: silence.name,
    enable: silence.enable,
    matchAll: silence.matchAll,
    type,
    labelsText: formatLabelMatchers(silence.labels ?? undefined),
    days: silence.days ?? [7, 1, 2, 3, 4, 5, 6],
    periodStart: type === 0 ? localDateTimeValue(start) : timeValue(start),
    periodEnd: type === 0 ? localDateTimeValue(end) : timeValue(end)
  };
}
