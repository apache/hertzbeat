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
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AlertSilenceContractError';
  }
}

export class AlertSilenceMissingError extends Error {
  constructor() {
    super('Alert Silence detail is missing');
    this.name = 'AlertSilenceMissingError';
  }
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
