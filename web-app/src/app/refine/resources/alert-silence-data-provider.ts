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

import type {
  BaseRecord,
  CreateResponse,
  CustomParams,
  CustomResponse,
  DataProvider,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneResponse,
  UpdateResponse
} from '@refinedev/core';

import {
  deleteAlertSilence,
  isAlertSilenceMissing,
  loadAlertSilence,
  loadAlertSilences,
  saveAlertSilence,
  updateAlertSilenceEnabled
} from '@/features/alert/alert-silence-api';
import {
  AlertSilenceContractError,
  alertSilencePageSizes,
  validateAlertSilenceDraft,
  type AlertSilence,
  type AlertSilenceDraft,
  type AlertSilenceQuery
} from '@/features/alert/alert-silence-model';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';

export const alertSilenceResourceName = 'alert-silences';
export const alertSilenceCreateActionUrl = '/api/alert/silence';

type UpdateVariables = {
  draft: AlertSilenceDraft;
  query: AlertSilenceQuery;
} | {
  operation: 'toggle';
  enable: boolean;
  query: AlertSilenceQuery;
};

export const alertSilenceDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const query = readListQuery(params);
      const page = await loadAlertSilences(query);
      return { data: page.content as unknown as TData[], total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      const record = await loadAlertSilence(id);
      assertCanonicalIdentity(record, id);
      return { data: record as unknown as TData };
    });
  },

  create<TData extends BaseRecord = BaseRecord>(): Promise<CreateResponse<TData>> {
    return Promise.reject(contractError('ALERT_SILENCE_CREATE_UNSUPPORTED', 405));
  },

  update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      const variables = readUpdateVariables(params.variables, id);
      if ('operation' in variables) {
        const before = await loadAlertSilence(id);
        assertCanonicalIdentity(before, id);
        await updateAlertSilenceEnabled(before, variables.enable);
      } else {
        await saveAlertSilence(variables.draft);
      }
      const canonical = await loadAlertSilence(id);
      assertCanonicalIdentity(canonical, id);
      await loadAlertSilences(variables.query);
      return { data: canonical as unknown as TData };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      const query = readDeleteVariables(params.variables);
      const canonical = await loadAlertSilence(id);
      assertCanonicalIdentity(canonical, id);
      await deleteAlertSilence(id);
      try {
        await loadAlertSilence(id);
        throw contractError('ALERT_SILENCE_DELETE_NOT_CONFIRMED');
      } catch (reason) {
        if (!isAlertSilenceMissing(reason)) throw reason;
      }
      const proof = await loadAlertSilences(query);
      if (proof.content.some(item => item.id === id)) {
        throw contractError('ALERT_SILENCE_DELETE_NOT_CONFIRMED');
      }
      return { data: canonical as unknown as TData };
    });
  },

  custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
    params: CustomParams<TQuery, TPayload>
  ): Promise<CustomResponse<TData>> {
    return protect(async () => {
      if (params.url !== alertSilenceCreateActionUrl || params.method !== 'post') {
        throw contractError('ALERT_SILENCE_CUSTOM_ACTION_UNSUPPORTED', 405);
      }
      const draft = readDraft(params.payload);
      if (draft.id !== undefined) throw contractError('ALERT_SILENCE_VARIABLES_INVALID', 400);
      await saveAlertSilence(draft);
      return { data: { acknowledged: true } as unknown as TData };
    });
  },

  getApiUrl: () => '/api/alert'
};

async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    if (isAlertSilenceMissing(reason)) throw contractError('ALERT_SILENCE_MISSING', 404);
    if (reason instanceof AlertSilenceContractError) {
      throw contractError('ALERT_SILENCE_RESPONSE_INVALID');
    }
    if (isUnavailable(reason)) {
      const status = reason.status ?? 0;
      throw createRefineHttpError(
        'Alert Silence is unavailable', status, 'ALERT_SILENCE_UNAVAILABLE',
        status === 0 ? 'network' : 'http', reason.status
      );
    }
    throw toRefineHttpError(reason);
  }
}

function assertResource(resource: string) {
  if (resource !== alertSilenceResourceName) {
    throw contractError('ALERT_SILENCE_RESOURCE_UNSUPPORTED', 400);
  }
}

function readListQuery(params: GetListParams): AlertSilenceQuery {
  if (params.sorters && params.sorters.length > 0) {
    throw contractError('ALERT_SILENCE_SORT_UNSUPPORTED', 400);
  }
  const pagination = readPagination(params.pagination);
  let search = '';
  for (const filter of params.filters ?? []) {
    if (
      !('field' in filter)
      || filter.field !== 'search'
      || filter.operator !== 'contains'
      || typeof filter.value !== 'string'
    ) {
      throw contractError('ALERT_SILENCE_FILTER_UNSUPPORTED', 400);
    }
    search = filter.value.trim();
  }
  return { search, ...pagination };
}

function readPagination(pagination: GetListParams['pagination']) {
  if (pagination?.mode && pagination.mode !== 'server') {
    throw contractError('ALERT_SILENCE_PAGINATION_UNSUPPORTED', 400);
  }
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? 8;
  if (
    !Number.isSafeInteger(currentPage)
    || currentPage < 1
    || !alertSilencePageSizes.includes(pageSize as (typeof alertSilencePageSizes)[number])
  ) {
    throw contractError('ALERT_SILENCE_PAGINATION_INVALID', 400);
  }
  return { pageIndex: currentPage - 1, pageSize };
}

function readUpdateVariables(value: unknown, id: number): UpdateVariables {
  const source = objectValue(value);
  const query = readQuery(source.query);
  if (source.operation === 'toggle') {
    if (typeof source.enable !== 'boolean') throw contractError('ALERT_SILENCE_VARIABLES_INVALID', 400);
    return { operation: 'toggle', enable: source.enable, query };
  }
  return { draft: readDraft(source.draft, id), query };
}

function readDeleteVariables(value: unknown) {
  return readQuery(objectValue(value).query);
}

function readDraft(value: unknown, id?: number): AlertSilenceDraft {
  const source = objectValue(value);
  const draft = {
    ...(id === undefined ? {} : { id }),
    name: source.name,
    enable: source.enable,
    matchAll: source.matchAll,
    type: source.type,
    labelsText: source.labelsText,
    days: source.days,
    periodStart: source.periodStart,
    periodEnd: source.periodEnd
  } as AlertSilenceDraft;
  if (
    !hasValidDraftScalars(source)
    || !hasValidDraftDays(source.days)
    || !hasValidDraftPeriod(source)
    || validateAlertSilenceDraft(draft).length > 0
    || (source.id !== undefined && source.id !== id)
  ) {
    throw contractError('ALERT_SILENCE_VARIABLES_INVALID', 400);
  }
  return draft;
}

function hasValidDraftScalars(source: Record<string, unknown>) {
  return typeof source.name === 'string'
    && typeof source.enable === 'boolean'
    && typeof source.matchAll === 'boolean'
    && (source.type === 0 || source.type === 1)
    && typeof source.labelsText === 'string';
}

function hasValidDraftDays(value: unknown) {
  return Array.isArray(value)
    && (value as unknown[]).every(day => Number.isSafeInteger(day) && (day as number) >= 1 && (day as number) <= 7);
}

function hasValidDraftPeriod(source: Record<string, unknown>) {
  return typeof source.periodStart === 'string' && typeof source.periodEnd === 'string';
}

function readQuery(value: unknown): AlertSilenceQuery {
  const source = objectValue(value);
  if (
    typeof source.search !== 'string'
    || !Number.isSafeInteger(source.pageIndex)
    || (source.pageIndex as number) < 0
    || !alertSilencePageSizes.includes(source.pageSize as (typeof alertSilencePageSizes)[number])
  ) {
    throw contractError('ALERT_SILENCE_VARIABLES_INVALID', 400);
  }
  return {
    search: source.search,
    pageIndex: source.pageIndex as number,
    pageSize: source.pageSize as AlertSilenceQuery['pageSize']
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('ALERT_SILENCE_VARIABLES_INVALID', 400);
  }
  return value as Record<string, unknown>;
}

function readId(value: string | number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw contractError('ALERT_SILENCE_ID_INVALID', 400);
  }
  return value;
}

function assertCanonicalIdentity(record: AlertSilence, id: number) {
  if (record.id !== id) throw contractError('ALERT_SILENCE_CANONICAL_IDENTITY_INVALID');
}

function isUnavailable(reason: unknown): reason is { status?: number } {
  if (!reason || typeof reason !== 'object') return false;
  const status = (reason as { status?: unknown }).status;
  const cause = (reason as { cause?: unknown }).cause;
  return status === 502 || status === 503 || status === 504 || status === undefined && cause !== undefined;
}

function contractError(code: string, status = 502) {
  return createRefineHttpError('Alert Silence contract failed', status, code);
}
