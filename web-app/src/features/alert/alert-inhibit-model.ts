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

export const alertInhibitPageSizes = [8, 15, 25] as const;

export type AlertInhibitQuery = { search: string; pageIndex: number; pageSize: number };

export type AlertInhibitDraft = {
  id?: number;
  name: string;
  sourceLabelsText: string;
  targetLabelsText: string;
  equalLabels: string[];
  enable: boolean;
};

export type AlertInhibit = {
  id: number;
  name: string;
  sourceLabels: Record<string, string> | null;
  targetLabels: Record<string, string> | null;
  equalLabels: string[] | null;
  enable: boolean | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | null;
  gmtUpdate?: string | null;
};

export type AlertInhibitPage = {
  content: AlertInhibit[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class AlertInhibitContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlertInhibitContractError';
  }
}

export class AlertInhibitMissingError extends Error {
  constructor() {
    super('Alert Inhibit detail is missing');
    this.name = 'AlertInhibitMissingError';
  }
}

export function parseAlertInhibitDetail(value: unknown): AlertInhibit {
  if (value === null || value === undefined) throw new AlertInhibitMissingError();
  const source = record(value, 'detail');
  const result: AlertInhibit = {
    id: positiveInteger(source.id, 'id'),
    name: policyName(source.name),
    sourceLabels: nullableStringMap(source.sourceLabels, 'sourceLabels'),
    targetLabels: nullableStringMap(source.targetLabels, 'targetLabels'),
    equalLabels: nullableUniqueStrings(source.equalLabels, 'equalLabels'),
    enable: nullableBoolean(source.enable, 'enable')
  };
  copyOptionalNullableString(source, result, 'creator');
  copyOptionalNullableString(source, result, 'modifier');
  copyOptionalNullableString(source, result, 'gmtCreate');
  copyOptionalNullableString(source, result, 'gmtUpdate');
  return result;
}

export function parseAlertInhibitPage(value: unknown, query: AlertInhibitQuery): AlertInhibitPage {
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
  const content = (source.content as unknown[]).map(parseAlertInhibitDetail);
  if (new Set(content.map(item => item.id)).size !== content.length) throw contract('duplicate ids are not allowed');
  return { content, totalElements, totalPages, number, size };
}

export function readAlertInhibitQuery(params: URLSearchParams): AlertInhibitQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: alertInhibitPageSizes.includes(pageSize as typeof alertInhibitPageSizes[number]) ? pageSize : 8
  };
}

export function writeAlertInhibitQuery(query: AlertInhibitQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export function buildAlertInhibitListPath(query: AlertInhibitQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize),
    sort: 'id',
    order: 'desc'
  });
  if (query.search) params.set('search', query.search);
  return `/api/alert/inhibits?${params.toString()}`;
}

export function createAlertInhibitDraft(): AlertInhibitDraft {
  return {
    name: '',
    sourceLabelsText: '',
    targetLabelsText: '',
    equalLabels: [],
    enable: true
  };
}

export function buildAlertInhibitPayload(draft: AlertInhibitDraft) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    sourceLabels: parseLabelMatchers(draft.sourceLabelsText) ?? {},
    targetLabels: parseLabelMatchers(draft.targetLabelsText) ?? {},
    equalLabels: [...new Set(draft.equalLabels.map(label => label.trim()).filter(Boolean))],
    enable: draft.enable
  };
}

export function buildAlertInhibitTogglePayload(inhibit: AlertInhibit, enable: boolean) {
  return {
    id: inhibit.id,
    name: inhibit.name,
    sourceLabels: inhibit.sourceLabels,
    targetLabels: inhibit.targetLabels,
    equalLabels: inhibit.equalLabels,
    enable
  };
}

export function validateAlertInhibitDraft(draft: AlertInhibitDraft) {
  const invalid: Array<'name' | 'sourceLabels' | 'targetLabels' | 'equalLabels'> = [];
  if (!draft.name.trim()) invalid.push('name');
  if (!parseLabelMatchers(draft.sourceLabelsText)) invalid.push('sourceLabels');
  if (!parseLabelMatchers(draft.targetLabelsText)) invalid.push('targetLabels');
  if (draft.equalLabels.map(label => label.trim()).filter(Boolean).length === 0) invalid.push('equalLabels');
  return invalid;
}

export function alertInhibitDraftFromDetail(inhibit: AlertInhibit): AlertInhibitDraft {
  return {
    id: inhibit.id,
    name: inhibit.name ?? '',
    sourceLabelsText: formatLabelMatchers(inhibit.sourceLabels ?? undefined),
    targetLabelsText: formatLabelMatchers(inhibit.targetLabels ?? undefined),
    equalLabels: inhibit.equalLabels ?? [],
    enable: inhibit.enable ?? true
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

function policyName(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) throw contract('name must be a non-blank string');
  if (value.length > 100) throw contract('name exceeds the Java entity limit');
  return value;
}

function nullableStringMap(value: unknown, field: string): Record<string, string> | null {
  if (value === null) return null;
  const source = record(value, field);
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(source)) {
    if (!key.trim() || typeof item !== 'string') throw contract(`${field} must contain string entries`);
    result[key] = item;
  }
  return result;
}

function nullableUniqueStrings(value: unknown, field: string): string[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) throw contract(`${field} must be an array or null`);
  const result = (value as unknown[]).map(item => {
    if (typeof item !== 'string' || !item.trim()) throw contract(`${field} must contain non-blank strings`);
    return item;
  });
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
  target: AlertInhibit,
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
  return new AlertInhibitContractError(message);
}
