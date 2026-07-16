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

export const alertGroupPageSizes = [8, 15, 25] as const;

export type AlertGroupQuery = { search: string; pageIndex: number; pageSize: number };

export type AlertGroupDraft = {
  id?: number;
  name: string;
  groupLabels: string[];
  groupWait: number;
  groupInterval: number;
  repeatInterval: number;
  enable: boolean;
};

export type AlertGroupConverge = {
  id: number;
  name: string;
  groupLabels: string[] | null;
  groupWait: number | null;
  groupInterval: number | null;
  repeatInterval: number | null;
  enable: boolean | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type AlertGroupPage = {
  content: AlertGroupConverge[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class AlertGroupContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlertGroupContractError';
  }
}

export class AlertGroupMissingError extends Error {
  constructor() {
    super('Alert Group detail is missing');
    this.name = 'AlertGroupMissingError';
  }
}

export function parseAlertGroupDetail(value: unknown): AlertGroupConverge {
  if (value === null || value === undefined) throw new AlertGroupMissingError();
  const source = record(value, 'detail');
  const result: AlertGroupConverge = {
    id: positiveInteger(source.id, 'id'),
    name: nonBlankString(source.name, 'name'),
    groupLabels: nullableUniqueStrings(source.groupLabels, 'groupLabels'),
    groupWait: nullableNonNegativeInteger(source.groupWait, 'groupWait'),
    groupInterval: nullableNonNegativeInteger(source.groupInterval, 'groupInterval'),
    repeatInterval: nullableNonNegativeInteger(source.repeatInterval, 'repeatInterval'),
    enable: nullableBoolean(source.enable, 'enable')
  };
  copyOptionalNullableString(source, result, 'creator');
  copyOptionalNullableString(source, result, 'modifier');
  copyOptionalNullableString(source, result, 'gmtCreate');
  copyOptionalNullableString(source, result, 'gmtUpdate');
  return result;
}

export function parseAlertGroupPage(value: unknown, query: AlertGroupQuery): AlertGroupPage {
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
  const content = (source.content as unknown[]).map(parseAlertGroupDetail);
  if (new Set(content.map(item => item.id)).size !== content.length) throw contract('duplicate ids are not allowed');
  return { content, totalElements, totalPages, number, size };
}

export function readAlertGroupQuery(params: URLSearchParams): AlertGroupQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: alertGroupPageSizes.includes(pageSize as typeof alertGroupPageSizes[number]) ? pageSize : 8
  };
}

export function writeAlertGroupQuery(query: AlertGroupQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export function buildAlertGroupListPath(query: AlertGroupQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize),
    sort: 'id',
    order: 'desc'
  });
  if (query.search) params.set('search', query.search);
  return `/api/alert/groups?${params.toString()}`;
}

export function createAlertGroupDraft(): AlertGroupDraft {
  return {
    name: '',
    groupLabels: [],
    groupWait: 30,
    groupInterval: 300,
    repeatInterval: 14400,
    enable: true
  };
}

export function buildAlertGroupPayload(draft: AlertGroupDraft) {
  const groupLabels = [...new Set(draft.groupLabels.map(label => label.trim()).filter(Boolean))];
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    groupLabels,
    groupWait: draft.groupWait,
    groupInterval: draft.groupInterval,
    repeatInterval: draft.repeatInterval,
    enable: draft.enable
  };
}

export function buildAlertGroupTogglePayload(group: AlertGroupConverge, enable: boolean) {
  return {
    id: group.id,
    name: group.name,
    groupLabels: group.groupLabels,
    groupWait: group.groupWait,
    groupInterval: group.groupInterval,
    repeatInterval: group.repeatInterval,
    enable
  };
}

export function validateAlertGroupDraft(draft: AlertGroupDraft) {
  const invalid: Array<'name' | 'groupLabels'> = [];
  if (!draft.name.trim()) invalid.push('name');
  if (draft.groupLabels.map(label => label.trim()).filter(Boolean).length === 0) invalid.push('groupLabels');
  return invalid;
}

export function alertGroupDraftFromDetail(group: AlertGroupConverge): AlertGroupDraft {
  return {
    id: group.id,
    name: group.name ?? '',
    groupLabels: group.groupLabels ?? [],
    groupWait: group.groupWait ?? 30,
    groupInterval: group.groupInterval ?? 300,
    repeatInterval: group.repeatInterval ?? 14400,
    enable: group.enable ?? true
  };
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

function nullableNonNegativeInteger(value: unknown, field: string) {
  return value === null ? null : nonNegativeInteger(value, field);
}

function nonBlankString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw contract(`${field} must be a non-blank string`);
  if (field === 'name' && value.length > 100) throw contract('name exceeds the Java entity limit');
  return value;
}

function nullableUniqueStrings(value: unknown, field: string): string[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) throw contract(`${field} must be an array or null`);
  const result = (value as unknown[]).map(item => nonBlankString(item, `${field} item`));
  if (new Set(result).size !== result.length) throw contract(`${field} must contain unique entries`);
  return result;
}

function nullableBoolean(value: unknown, field: string) {
  if (value === null) return null;
  if (typeof value !== 'boolean') throw contract(`${field} must be a boolean or null`);
  return value;
}

function copyOptionalNullableString(
  source: Record<string, unknown>,
  target: AlertGroupConverge,
  field: 'creator' | 'modifier' | 'gmtCreate' | 'gmtUpdate'
) {
  if (!(field in source)) return;
  const value = source[field];
  if (value !== null && typeof value !== 'string') throw contract(`${field} must be a string or null`);
  if (field.startsWith('gmt') && typeof value === 'string' && !isLocalDateTime(value)) {
    throw contract(`${field} must be a Java local date-time`);
  }
  target[field] = value;
}

function isLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return month >= 1 && month <= 12
    && day >= 1 && day <= daysInMonth(year, month)
    && Number(hourText) <= 23
    && Number(minuteText) <= 59
    && Number(secondText) <= 59;
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function contract(message: string) {
  return new AlertGroupContractError(message);
}
