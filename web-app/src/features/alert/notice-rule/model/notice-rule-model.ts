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

import type { RemotePageState } from '@/shared/remote-state';
import { compactTablePageSizes } from '@/shared/pagination';

import { formatLabelMatchers, parseLabelMatchers } from '../../shared/alert-label-matchers';
import type { NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../notice-template-model';
import type { NoticeRuleCollectionFailureKind } from './notice-rule-failure';

export const noticeRulePageSizes = compactTablePageSizes;
export const noticeRuleWeekdays = [7, 1, 2, 3, 4, 5, 6] as const;
export const maximumNoticeRuleScanPages = 10_000;

export type NoticeRuleQuery = { name: string; pageIndex: number; pageSize: number };
export type NoticeRule = {
  id: number;
  name: string;
  receiverId: number[];
  receiverName: string[];
  templateId: number | null;
  templateName: string | null;
  enable: boolean;
  filterAll: boolean;
  labels?: Record<string, string> | null;
  days?: number[] | null;
  periodStart?: string | number | null;
  periodEnd?: string | number | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
};

export type NoticeRuleListState = RemotePageState<NoticeRule, NoticeRuleCollectionFailureKind>;

export type NoticeRuleDraft = {
  id?: number;
  name: string;
  receiverIds: number[];
  receiverNames: string[];
  templateId: number | null;
  templateName: string | null;
  enable: boolean;
  filterAll: boolean;
  labelsText: string;
  limitDays: boolean;
  days: number[];
  periodStart: string;
  periodEnd: string;
};

export type NoticeRuleMutationVariables = {
  draft: NoticeRuleDraft;
  receivers: NoticeReceiverOption[];
  templates: NoticeTemplate[];
};

export function resolveNoticeRuleListState(
  pending: boolean,
  failure: NoticeRuleCollectionFailureKind | null,
  records: NoticeRule[],
  total?: number
): NoticeRuleListState {
  if (pending) return { kind: 'loading' };
  if (failure) return { kind: failure };
  if (total === undefined) return { kind: 'invalid' };
  if (records.length === 0 && total === 0) return { kind: 'empty' };
  return { kind: 'ready', records, total };
}

export function readNoticeRuleQuery(params: URLSearchParams): NoticeRuleQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    name: params.get('name')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: noticeRulePageSizes.includes(pageSize as (typeof noticeRulePageSizes)[number]) ? pageSize : 8
  };
}

export function writeNoticeRuleQuery(query: NoticeRuleQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.name) params.set('name', query.name);
  return params;
}

export function createNoticeRuleDraft(): NoticeRuleDraft {
  return {
    name: '',
    receiverIds: [],
    receiverNames: [],
    templateId: null,
    templateName: null,
    enable: true,
    filterAll: true,
    labelsText: '',
    limitDays: false,
    days: [1, 2, 3, 4, 5, 6, 7],
    periodStart: '',
    periodEnd: ''
  };
}

function timeInput(value?: string | number | null) {
  if (value == null || value === '') return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function noticeRuleDraftFromDetail(rule: NoticeRule): NoticeRuleDraft {
  const days = rule.days?.filter(day => day >= 1 && day <= 7) ?? [1, 2, 3, 4, 5, 6, 7];
  return {
    id: rule.id,
    name: rule.name,
    receiverIds: rule.receiverId ?? [],
    receiverNames: rule.receiverName ?? [],
    templateId: rule.templateId,
    templateName: rule.templateName,
    enable: rule.enable,
    filterAll: rule.filterAll,
    labelsText: formatLabelMatchers(rule.labels ?? undefined),
    limitDays: days.length !== 7,
    days,
    periodStart: timeInput(rule.periodStart),
    periodEnd: timeInput(rule.periodEnd)
  };
}

function timezoneOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  return `${sign}${String(Math.trunc(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

function localIsoTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  const localDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
  return `${localDate}T${value}:00${timezoneOffset(-date.getTimezoneOffset())}`;
}

export function buildNoticeRulePayload(
  draft: NoticeRuleDraft,
  receivers: NoticeReceiverOption[] = [],
  templates: NoticeTemplate[] = []
) {
  const receiverNames = draft.receiverIds
    .map(id => receivers.find(receiver => receiver.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const template = draft.templateId == null ? null : templates.find(item => item.id === draft.templateId);
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    receiverId: draft.receiverIds,
    receiverName: receiverNames,
    templateId: draft.templateId,
    templateName: template?.name ?? null,
    enable: draft.enable,
    filterAll: draft.filterAll,
    labels: draft.filterAll ? {} : (parseLabelMatchers(draft.labelsText) ?? {}),
    days: draft.limitDays ? draft.days : [1, 2, 3, 4, 5, 6, 7],
    periodStart: draft.periodStart ? localIsoTime(draft.periodStart) : null,
    periodEnd: draft.periodEnd ? localIsoTime(draft.periodEnd) : null
  };
}

type NoticeRuleInvalidField = 'name' | 'receiverIds' | 'labelsText' | 'days' | 'periodStart' | 'periodEnd';

function requiredFieldErrors(draft: NoticeRuleDraft): NoticeRuleInvalidField[] {
  const invalid: NoticeRuleInvalidField[] = [];
  if (!draft.name.trim() || draft.name.trim().length > 100) invalid.push('name');
  if (draft.receiverIds.length === 0) invalid.push('receiverIds');
  if (!draft.filterAll && parseLabelMatchers(draft.labelsText) == null) invalid.push('labelsText');
  if (draft.limitDays && draft.days.length === 0) invalid.push('days');
  return invalid;
}

function scheduleErrors(draft: NoticeRuleDraft): NoticeRuleInvalidField[] {
  const invalid: NoticeRuleInvalidField[] = [];
  if (draft.periodStart && !draft.periodEnd) invalid.push('periodEnd');
  if (!draft.periodStart && draft.periodEnd) invalid.push('periodStart');
  if (draft.periodStart && localIsoTime(draft.periodStart) == null) invalid.push('periodStart');
  if (draft.periodEnd && localIsoTime(draft.periodEnd) == null) invalid.push('periodEnd');
  return invalid;
}

export function validateNoticeRuleDraft(draft: NoticeRuleDraft) {
  return [...new Set([...requiredFieldErrors(draft), ...scheduleErrors(draft)])];
}

export function validateNoticeRuleDependencies(
  draft: NoticeRuleDraft,
  receivers: NoticeReceiverOption[],
  templates: NoticeTemplate[]
) {
  const invalid: Array<'receiverIds' | 'templateId'> = [];
  const uniqueIds = new Set(draft.receiverIds);
  const selectedReceivers = draft.receiverIds
    .map(id => receivers.find(receiver => receiver.id === id))
    .filter((receiver): receiver is NoticeReceiverOption => receiver !== undefined);
  if (uniqueIds.size !== draft.receiverIds.length || selectedReceivers.length !== draft.receiverIds.length) {
    invalid.push('receiverIds');
  }
  if (draft.templateId != null) {
    const template = templates.find(item => item.id === draft.templateId && !item.preset);
    if (
      !template ||
      selectedReceivers.length !== draft.receiverIds.length ||
      selectedReceivers.some(receiver => receiver.type !== template.type)
    ) {
      invalid.push('templateId');
    }
  }
  return invalid;
}

export function noticeRuleMatchesDraft(
  rule: NoticeRule,
  draft: NoticeRuleDraft,
  receivers: NoticeReceiverOption[],
  templates: NoticeTemplate[]
) {
  const expected = buildNoticeRulePayload(draft, receivers, templates);
  const canonical = noticeRuleDraftFromDetail(rule);
  return [
    rule.name === expected.name,
    sameNumbers(rule.receiverId, expected.receiverId),
    sameStrings(rule.receiverName, expected.receiverName),
    rule.templateId === expected.templateId,
    rule.templateName === expected.templateName,
    rule.enable === expected.enable,
    rule.filterAll === expected.filterAll,
    sameRecord(rule.labels ?? {}, expected.labels),
    sameNumbers(rule.days ?? [], expected.days),
    canonical.periodStart === draft.periodStart,
    canonical.periodEnd === draft.periodEnd
  ].every(Boolean);
}

function sameNumbers(actual: readonly number[], expected: readonly number[]) {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function sameStrings(actual: readonly string[], expected: readonly string[]) {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function sameRecord(actual: Record<string, string>, expected: Record<string, string>) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return sameStrings(actualKeys, expectedKeys) && actualKeys.every(key => actual[key] === expected[key]);
}
