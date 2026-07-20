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
import {
  cloneNullableAlertSilenceDays,
  createDefaultAlertSilenceSchedule,
  displayAlertSilencePeriod,
  invalidAlertSilenceScheduleFields,
  resolveAlertSilenceDays,
  resolveAlertSilencePeriod
} from './alert-silence-schedule-model';
import type { AlertSilence, AlertSilenceDraft } from './alert-silence-types';

export { changeAlertSilenceType } from './alert-silence-schedule-model';

type InvalidDraftField = 'id' | 'name' | 'strategy' | 'labels' | 'days' | 'period';

export class AlertSilenceContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AlertSilenceContractError';
  }
}

export function createAlertSilenceDraft(): AlertSilenceDraft {
  return {
    name: '',
    enable: true,
    matchAll: true,
    type: 0,
    labelsText: '',
    ...createDefaultAlertSilenceSchedule()
  };
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
    days: resolveAlertSilenceDays(draft),
    ...resolveAlertSilencePeriod(draft)
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
  invalid.push(...invalidAlertSilenceScheduleFields(draft));
  return invalid;
}

function validateMatchers(draft: AlertSilenceDraft, invalid: InvalidDraftField[]) {
  if (!labelsAreUnchanged(draft) && !draft.matchAll && !tryParseLabels(draft.labelsText)) invalid.push('labels');
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
    periodStart: displayAlertSilencePeriod(silence.periodStart, silence.type),
    periodEnd: displayAlertSilencePeriod(silence.periodEnd, silence.type),
    persisted: {
      matchAll: silence.matchAll,
      type: silence.type,
      times: silence.times ?? null,
      labels: cloneNullableMap(silence.labels),
      days: cloneNullableAlertSilenceDays(silence.days),
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

function labelsAreUnchanged(draft: AlertSilenceDraft) {
  const original = draft.persisted;
  if (!original) return false;
  return draft.matchAll === original.matchAll && draft.labelsText === formatLabelMatchers(original.labels ?? undefined);
}

function tryParseLabels(value: unknown) {
  return typeof value === 'string' && parseLabelMatchers(value) !== null;
}

function validStrategy(draft: AlertSilenceDraft) {
  return (
    typeof draft.enable === 'boolean' &&
    typeof draft.matchAll === 'boolean' &&
    (draft.type === 0 || draft.type === 1) &&
    typeof draft.labelsText === 'string' &&
    Array.isArray(draft.days) &&
    typeof draft.periodStart === 'string' &&
    typeof draft.periodEnd === 'string'
  );
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

function cloneNullableMap(value: Record<string, string> | null | undefined) {
  return value == null ? null : { ...value };
}

function contract(message: string) {
  return new AlertSilenceContractError(message);
}
