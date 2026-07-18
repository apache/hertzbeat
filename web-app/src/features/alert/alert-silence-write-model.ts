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
import type { AlertSilence, AlertSilenceDraft, AlertSilenceType } from './alert-silence-types';

type InvalidDraftField = 'id' | 'name' | 'strategy' | 'labels' | 'days' | 'period';

export class AlertSilenceContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AlertSilenceContractError';
  }
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
  if (!start || !end) return { ...draft, type, periodStart: '', periodEnd: '' };
  if (end <= start) end.setDate(end.getDate() + 1);
  return { ...draft, type, periodStart: localDateTimeValue(start), periodEnd: localDateTimeValue(end) };
}

export function buildAlertSilencePayload(draft: AlertSilenceDraft) {
  const invalid = validateAlertSilenceDraft(draft);
  if (invalid.length > 0) throw contract(`invalid writable fields: ${invalid.join(',')}`);

  return {
    ...(draft.id === undefined ? {} : { id: positiveInteger(draft.id, 'id') }),
    name: draft.name.trim(),
    enable: draft.enable,
    matchAll: draft.matchAll,
    type: draft.type,
    ...(draft.persisted ? { times: draft.persisted.times } : {}),
    labels: resolveLabels(draft),
    days: resolveDays(draft),
    ...resolvePeriod(draft)
  };
}

export function buildAlertSilenceTogglePayload(silence: AlertSilence, enable: boolean) {
  return {
    id: positiveInteger(silence.id, 'id'),
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
  const invalid: InvalidDraftField[] = [];
  if (draft.id !== undefined && !isPositiveInteger(draft.id)) invalid.push('id');
  if (!validBoundedText(draft.name, 100)) invalid.push('name');
  if (!validStrategy(draft)) invalid.push('strategy');

  validateMatchers(draft, invalid);
  validateSchedule(draft, invalid);
  return invalid;
}

function validateMatchers(draft: AlertSilenceDraft, invalid: InvalidDraftField[]) {
  if (!labelsAreUnchanged(draft) && !draft.matchAll && !tryParseLabels(draft.labelsText)) invalid.push('labels');
}

function validateSchedule(draft: AlertSilenceDraft, invalid: InvalidDraftField[]) {
  if (!daysAreUnchanged(draft) && draft.type === 1 && !validDays(draft.days)) invalid.push('days');
  if (periodIsUnchanged(draft)) return;

  if (draft.type === 0) {
    if (!isLocalDateTime(draft.periodStart) || !isLocalDateTime(draft.periodEnd)
      || draft.periodStart >= draft.periodEnd) invalid.push('period');
  } else if (!toIsoTime(draft.periodStart) || !toIsoTime(draft.periodEnd)) {
    invalid.push('period');
  }
}

export function alertSilenceDraftFromDetail(silence: AlertSilence): AlertSilenceDraft {
  return {
    id: silence.id,
    name: silence.name,
    enable: silence.enable,
    matchAll: silence.matchAll,
    type: silence.type,
    labelsText: formatLabelMatchers(silence.labels ?? undefined),
    days: silence.days ? [...silence.days] : [],
    periodStart: displayPeriod(silence.periodStart, silence.type),
    periodEnd: displayPeriod(silence.periodEnd, silence.type),
    persisted: {
      matchAll: silence.matchAll,
      type: silence.type,
      times: silence.times ?? null,
      labels: cloneNullableMap(silence.labels),
      days: cloneNullableDays(silence.days),
      periodStart: silence.periodStart,
      periodEnd: silence.periodEnd
    }
  };
}

function resolveLabels(draft: AlertSilenceDraft) {
  // The form cannot display null distinctly from an empty matcher list. Keep
  // the canonical value until the operator changes a related visible field.
  const original = draft.persisted;
  if (original && labelsAreUnchanged(draft)) return cloneNullableMap(original.labels);
  if (draft.matchAll) return {};
  const labels = parseLabelMatchers(draft.labelsText);
  if (!labels) throw contract('labels are invalid');
  return labels;
}

function resolveDays(draft: AlertSilenceDraft) {
  // Old rows may contain null, duplicates, or otherwise non-normalized days.
  // An unrelated edit must not migrate those values as a side effect.
  const original = draft.persisted;
  if (original && daysAreUnchanged(draft)) return cloneNullableDays(original.days);
  return draft.type === 1 ? [...new Set(draft.days)] : [];
}

function resolvePeriod(draft: AlertSilenceDraft) {
  // ZonedDateTime values lose their original offset when rendered in a local
  // input. Preserve the source strings when the displayed schedule is intact.
  const original = draft.persisted;
  if (original && periodIsUnchanged(draft)) {
    return { periodStart: original.periodStart, periodEnd: original.periodEnd };
  }
  const convert = draft.type === 0 ? toIsoDateTime : toIsoTime;
  return { periodStart: convert(draft.periodStart), periodEnd: convert(draft.periodEnd) };
}

function labelsAreUnchanged(draft: AlertSilenceDraft) {
  const original = draft.persisted;
  if (!original) return false;
  return draft.matchAll === original.matchAll
    && draft.labelsText === formatLabelMatchers(original.labels ?? undefined);
}

function daysAreUnchanged(draft: AlertSilenceDraft) {
  const original = draft.persisted;
  if (!original || !Array.isArray(draft.days)) return false;
  return draft.type === original.type && sameNumbers(draft.days, original.days ?? []);
}

function periodIsUnchanged(draft: AlertSilenceDraft) {
  const original = draft.persisted;
  if (!original) return false;
  return draft.type === original.type
    && draft.periodStart === displayPeriod(original.periodStart, original.type)
    && draft.periodEnd === displayPeriod(original.periodEnd, original.type);
}

function displayPeriod(value: string | null, type: AlertSilenceType) {
  if (value === null) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return type === 0 ? localDateTimeValue(date) : timeValue(date);
}

function localDateTimeValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function timeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function dateAtTime(value: string) {
  const clock = parseClock(value);
  if (!clock) return null;
  const date = new Date();
  date.setHours(clock.hours, clock.minutes, 0, 0);
  return date;
}

function toIsoDateTime(value: string) {
  if (!isLocalDateTime(value)) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function toIsoTime(value: string) {
  const clock = parseClock(value);
  if (!clock) return '';
  const date = new Date();
  date.setHours(clock.hours, clock.minutes, 0, 0);
  return date.toISOString();
}

function parseClock(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? { hours, minutes } : null;
}

function isLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12
    && day >= 1 && day <= daysInMonth(year, month)
    && Number(match[4]) <= 23
    && Number(match[5]) <= 59;
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function tryParseLabels(value: unknown) {
  return typeof value === 'string' && parseLabelMatchers(value) !== null;
}

function validDays(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0
    && value.every(day => Number.isSafeInteger(day) && day >= 1 && day <= 7);
}

function validStrategy(draft: AlertSilenceDraft) {
  return typeof draft.enable === 'boolean' && typeof draft.matchAll === 'boolean'
    && (draft.type === 0 || draft.type === 1) && typeof draft.labelsText === 'string'
    && Array.isArray(draft.days) && typeof draft.periodStart === 'string' && typeof draft.periodEnd === 'string';
}

function validBoundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && Boolean(value.trim()) && value.length <= max;
}

function positiveInteger(value: unknown, field: string) {
  if (!isPositiveInteger(value)) throw contract(`${field} must be a positive safe integer`);
  return value;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function sameNumbers(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function cloneNullableMap(value: Record<string, string> | null | undefined) {
  return value == null ? null : { ...value };
}

function cloneNullableDays(value: number[] | null | undefined) {
  return value == null ? null : [...value];
}

function contract(message: string) {
  return new AlertSilenceContractError(message);
}
