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

import { compactTablePageSizes, type PagedCollection } from '@/shared/pagination';

export const alertPageSizes = compactTablePageSizes;
export const alertStatuses = ['firing', 'pending', 'acknowledged', 'resolved'] as const;
export const alertStatusFilters = ['firing', 'acknowledged', 'resolved'] as const;
export const alertRecordStatuses = ['firing', 'acknowledged', 'resolved'] as const;
export const alertGroupTargetStatuses = ['firing', 'acknowledged', 'resolved'] as const;
export const alertSeverities = ['info', 'warning', 'critical', 'emergency'] as const;

export type AlertStatus = (typeof alertStatuses)[number];
export type AlertRecordStatus = (typeof alertRecordStatuses)[number];
export type AlertGroupTargetStatus = (typeof alertGroupTargetStatuses)[number];
export type AlertStatusFilter = '' | (typeof alertStatusFilters)[number];
export type AlertSeverity = '' | (typeof alertSeverities)[number];
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
  alerts: AlertRecord[];
  gmtUpdate: ServerLocalDateTime | null;
};

/** A hydrated backend SingleAlert projected as operator-facing evidence. */
export type AlertRecord = {
  id: number;
  labels: Record<string, string> | null;
  annotations: Record<string, string> | null;
  content: string | null;
  status: AlertRecordStatus;
  triggerTimes: number | null;
  startAt: number | null;
  activeAt: number | null;
  endAt: number | null;
};

export type AlertPage = PagedCollection<AlertGroup>;

export class AlertContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AlertContractError';
  }
}

export type AlertFailureKind = 'unavailable' | 'error';
export type AlertWriteOutcome = 'rejected' | 'uncertain';

/** Stable request evidence emitted by the Alert Center API boundary. */
export class AlertRequestFailure extends Error {
  constructor(
    readonly kind: AlertFailureKind,
    readonly writeOutcome: AlertWriteOutcome = 'uncertain'
  ) {
    super('Alert request failed');
    this.name = 'AlertRequestFailure';
  }
}

export function alertFailureKind(error: unknown): AlertFailureKind {
  return error instanceof AlertRequestFailure ? error.kind : 'error';
}

export function alertWriteOutcome(error: unknown): AlertWriteOutcome {
  return error instanceof AlertRequestFailure ? error.writeOutcome : 'uncertain';
}

/** Canonicalizes every batch command before it reaches the transport boundary. */
export function normalizeAlertGroupIds(ids: readonly number[]) {
  const uniqueIds = [...new Set(ids)].sort((left, right) => left - right);
  if (uniqueIds.length === 0 || uniqueIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new AlertContractError('Alert group ids are invalid');
  }
  return uniqueIds;
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
  return alertPageSizes.includes(requested as (typeof alertPageSizes)[number]) ? requested : 8;
}
