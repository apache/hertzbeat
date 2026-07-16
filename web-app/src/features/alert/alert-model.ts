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

export const alertPageSizes = [8, 15, 25] as const;
export const alertStatuses = ['firing', 'pending', 'acknowledged', 'resolved'] as const;
export const alertStatusFilters = ['firing', 'acknowledged', 'resolved'] as const;
export const alertSeverities = ['info', 'warning', 'critical', 'emergency'] as const;

export type AlertStatus = typeof alertStatuses[number];
export type AlertStatusFilter = '' | typeof alertStatusFilters[number];
export type AlertSeverity = '' | typeof alertSeverities[number];
declare const serverLocalDateTimeBrand: unique symbol;
export type ServerLocalDateTime = string & { readonly [serverLocalDateTimeBrand]: true };

export type AlertQuery = {
  search: string;
  status: AlertStatusFilter;
  severity: AlertSeverity;
  serviceName: string;
  serviceNamespace: string;
  environment: string;
  pageIndex: number;
  pageSize: number;
};

export type AlertSummary = {
  total: number;
  dealNum: number;
  rate: number;
  priorityWarningNum: number;
  priorityCriticalNum: number;
  priorityEmergencyNum: number;
};

export type AlertGroup = {
  id: number;
  status: AlertStatus;
  groupLabels: Record<string, string> | null;
  commonLabels: Record<string, string> | null;
  commonAnnotations: Record<string, string> | null;
  alertFingerprints: string[] | null;
  gmtUpdate: ServerLocalDateTime | null;
};

export type AlertPage = {
  content: AlertGroup[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export class AlertContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlertContractError';
  }
}

export function readAlertQuery(params: URLSearchParams): AlertQuery {
  return {
    search: readText(params, 'search'),
    status: readEnum(params.get('status'), alertStatusFilters),
    severity: readEnum(params.get('severity'), alertSeverities),
    serviceName: readText(params, 'serviceName'),
    serviceNamespace: readText(params, 'serviceNamespace'),
    environment: readText(params, 'environment'),
    pageIndex: readPageIndex(params.get('pageIndex')),
    pageSize: readPageSize(params.get('pageSize'))
  };
}

export function writeAlertQuery(query: AlertQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.severity) params.set('severity', query.severity);
  if (query.serviceName) params.set('serviceName', query.serviceName);
  if (query.serviceNamespace) params.set('serviceNamespace', query.serviceNamespace);
  if (query.environment) params.set('environment', query.environment);
  return params;
}

export function buildAlertListPath(query: AlertQuery) {
  const params = writeAlertQuery(query);
  params.set('sort', 'gmtUpdate');
  params.set('order', 'desc');
  return `/api/alerts/group?${params.toString()}`;
}

export function alertStatusColor(status?: string) {
  if (status === 'firing') return 'red';
  if (status === 'acknowledged') return 'gold';
  if (status === 'resolved') return 'green';
  return 'default';
}

export function parseAlertSummary(value: unknown): AlertSummary {
  const source = record(value, 'summary');
  const summary = {
    total: nonNegativeInteger(source.total, 'total'),
    dealNum: nonNegativeInteger(source.dealNum, 'dealNum'),
    rate: percentage(source.rate),
    priorityWarningNum: nonNegativeInteger(source.priorityWarningNum, 'priorityWarningNum'),
    priorityCriticalNum: nonNegativeInteger(source.priorityCriticalNum, 'priorityCriticalNum'),
    priorityEmergencyNum: nonNegativeInteger(source.priorityEmergencyNum, 'priorityEmergencyNum')
  };
  const activeSeverityTotal = summary.priorityWarningNum
    + summary.priorityCriticalNum
    + summary.priorityEmergencyNum;
  if (summary.dealNum > summary.total || activeSeverityTotal > summary.total - summary.dealNum) {
    throw contract('summary counts are inconsistent');
  }
  const expectedRate = summary.total === 0 ? 100 : roundRate(100 * summary.dealNum / summary.total);
  if (roundRate(summary.rate) !== expectedRate) throw contract('summary rate is inconsistent');
  return summary;
}

export function parseAlertGroupPage(value: unknown, query: AlertQuery): AlertPage {
  const source = record(value, 'page');
  if (!Array.isArray(source.content)) throw contract('content must be an array');
  const totalElements = nonNegativeInteger(source.totalElements, 'totalElements');
  const totalPages = nonNegativeInteger(source.totalPages, 'totalPages');
  const number = nonNegativeInteger(source.number, 'number');
  const size = positiveInteger(source.size, 'size');
  if (number !== query.pageIndex || size !== query.pageSize) throw contract('page does not match the request');
  if (totalPages !== Math.ceil(totalElements / size)) throw contract('totalPages is inconsistent');
  const remaining = Math.max(0, totalElements - number * size);
  if (source.content.length > Math.min(size, remaining)) throw contract('page content is inconsistent');
  const content = (source.content as unknown[]).map(parseAlertGroup);
  if (new Set(content.map(item => item.id)).size !== content.length) throw contract('duplicate ids are not allowed');
  return { content, totalElements, totalPages, number, size };
}

function parseAlertGroup(value: unknown): AlertGroup {
  const source = record(value, 'group');
  return {
    id: positiveInteger(source.id, 'id'),
    status: requiredStatus(source.status),
    groupLabels: nullableStringMap(source.groupLabels, 'groupLabels'),
    commonLabels: labelsWithSeverity(source.commonLabels),
    commonAnnotations: nullableStringMap(source.commonAnnotations, 'commonAnnotations'),
    alertFingerprints: nullableStringArray(source.alertFingerprints, 'alertFingerprints'),
    gmtUpdate: serverLocalDateTime(source.gmtUpdate, 'gmtUpdate')
  };
}

function labelsWithSeverity(value: unknown) {
  const labels = nullableStringMap(value, 'commonLabels');
  const severity = labels?.severity;
  if (severity !== undefined && !alertSeverities.includes(severity as typeof alertSeverities[number])) {
    throw contract('commonLabels severity is unsupported');
  }
  return labels;
}

function readEnum<const T extends readonly string[]>(value: string | null, supported: T): '' | T[number] {
  const normalized = value?.trim().toLowerCase() ?? '';
  return supported.includes(normalized) ? normalized : '';
}

function readText(params: URLSearchParams, field: string) {
  return params.get(field)?.trim() ?? '';
}

function readPageIndex(value: string | null) {
  const requested = Number.parseInt(value ?? '', 10);
  return Number.isFinite(requested) && requested >= 0 ? requested : 0;
}

function readPageSize(value: string | null) {
  const requested = Number.parseInt(value ?? '', 10);
  return alertPageSizes.includes(requested as typeof alertPageSizes[number]) ? requested : 8;
}

function requiredStatus(value: unknown): AlertStatus {
  if (typeof value !== 'string' || !alertStatuses.includes(value as typeof alertStatuses[number])) {
    throw contract('status is unsupported');
  }
  return value as AlertStatus;
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw contract(`${field} must be an object`);
  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown, field: string) {
  const result = nonNegativeInteger(value, field);
  if (result === 0) throw contract(`${field} must be positive`);
  return result;
}

function nonNegativeInteger(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw contract(`${field} must be a non-negative integer`);
  }
  return value;
}

function percentage(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw contract('rate must be a finite percentage');
  }
  return value;
}

function nullableStringMap(value: unknown, field: string): Record<string, string> | null {
  if (value === null) return null;
  const source = record(value, field);
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(source)) {
    if (!key || typeof item !== 'string') throw contract(`${field} must contain string entries`);
    result[key] = item;
  }
  return result;
}

function nullableStringArray(value: unknown, field: string): string[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) throw contract(`${field} must be a string array or null`);
  const result: string[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== 'string') throw contract(`${field} must be a string array or null`);
    result.push(item);
  }
  return result;
}

function serverLocalDateTime(value: unknown, field: string): ServerLocalDateTime | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !isValidServerLocalDateTime(value)) {
    throw contract(`${field} must use the server-local date-time format`);
  }
  return value as ServerLocalDateTime;
}

function isValidServerLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  return month >= 1 && month <= 12
    && day >= 1 && day <= daysInMonth(year, month)
    && hour >= 0 && hour <= 23
    && minute >= 0 && minute <= 59
    && second >= 0 && second <= 59;
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function roundRate(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function contract(message: string) {
  return new AlertContractError(message);
}
