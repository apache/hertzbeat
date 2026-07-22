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

import type { AlertSilenceQuery } from './alert-silence-types';
import { compactTablePageSizes } from '@/shared/pagination';

export const alertSilencePageSizes = compactTablePageSizes;

export type AlertSilenceFailure = 'missing' | 'unavailable' | 'error';
export type AlertSilenceWriteOutcome = 'rejected' | 'uncertain';

export type {
  AlertSilence,
  AlertSilenceDraft,
  AlertSilencePage,
  AlertSilenceQuery,
  AlertSilenceType
} from './alert-silence-types';

export class AlertSilenceMissingError extends Error {
  constructor() {
    super('Alert Silence detail is missing');
    this.name = 'AlertSilenceMissingError';
  }
}

/**
 * Stable request evidence exposed by the Alert Silence API boundary. HTTP
 * status, backend messages, and network causes remain private to that boundary.
 */
export class AlertSilenceRequestFailure extends Error {
  constructor(
    readonly kind: AlertSilenceFailure,
    readonly writeOutcome: AlertSilenceWriteOutcome
  ) {
    super('Alert Silence request failed');
    this.name = 'AlertSilenceRequestFailure';
  }
}

/** Maps domain failures to the read state understood by Alert Silence screens. */
export function alertSilenceFailureKind(error: unknown): AlertSilenceFailure {
  if (error instanceof AlertSilenceMissingError) return 'missing';
  return error instanceof AlertSilenceRequestFailure ? error.kind : 'error';
}

/** Only an explicit HTTP 4xx proves that a write was rejected before commit. */
export function alertSilenceWriteOutcome(error: unknown): AlertSilenceWriteOutcome {
  return error instanceof AlertSilenceRequestFailure ? error.writeOutcome : 'uncertain';
}

export function readAlertSilenceQuery(params: URLSearchParams): AlertSilenceQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: alertSilencePageSizes.includes(pageSize as (typeof alertSilencePageSizes)[number]) ? pageSize : 8
  };
}

export function writeAlertSilenceQuery(query: AlertSilenceQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export {
  AlertSilenceContractError,
  alertSilenceDraftFromDetail,
  buildAlertSilencePayload,
  buildAlertSilenceTogglePayload,
  changeAlertSilenceType,
  createAlertSilenceDraft,
  validateAlertSilenceDraft
} from './alert-silence-write-model';
