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
  type AlertSilence
} from '@/features/alert/alert-silence-model';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';
import {
  readAlertSilenceDeleteVariables,
  readAlertSilenceDraft,
  readAlertSilenceId,
  readAlertSilenceListQuery,
  readAlertSilenceUpdateVariables
} from './alert-silence-data-provider-input';

export const alertSilenceResourceName = 'alert-silences';
export const alertSilenceCreateActionUrl = '/api/alert/silence';

export const alertSilenceDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const query = readAlertSilenceListQuery(params);
      const page = await loadAlertSilences(query);
      return { data: exposeProviderData<TData[]>(page.content), total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readAlertSilenceId(params.id);
      const record = await loadAlertSilence(id);
      assertCanonicalIdentity(record, id);
      return { data: exposeProviderData<TData>(record) };
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
      const id = readAlertSilenceId(params.id);
      const variables = readAlertSilenceUpdateVariables(params.variables, id);
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
      return { data: exposeProviderData<TData>(canonical) };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readAlertSilenceId(params.id);
      const query = readAlertSilenceDeleteVariables(params.variables);
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
      return { data: exposeProviderData<TData>(canonical) };
    });
  },

  custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
    params: CustomParams<TQuery, TPayload>
  ): Promise<CustomResponse<TData>> {
    return protect(async () => {
      if (params.url !== alertSilenceCreateActionUrl || params.method !== 'post') {
        throw contractError('ALERT_SILENCE_CUSTOM_ACTION_UNSUPPORTED', 405);
      }
      const draft = readAlertSilenceDraft(params.payload);
      await saveAlertSilence(draft);
      return { data: exposeProviderData<TData>({ acknowledged: true }) };
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

function assertCanonicalIdentity(record: AlertSilence, id: number) {
  if (record.id !== id) throw contractError('ALERT_SILENCE_CANONICAL_IDENTITY_INVALID');
}

function isUnavailable(reason: unknown): reason is { status?: number } {
  if (!reason || typeof reason !== 'object') return false;
  const status = 'status' in reason ? reason.status : undefined;
  const cause = 'cause' in reason ? reason.cause : undefined;
  return status === 502 || status === 503 || status === 504 || status === undefined && cause !== undefined;
}

function contractError(code: string, status = 502) {
  return createRefineHttpError('Alert Silence contract failed', status, code);
}

function exposeProviderData<TData>(value: unknown): TData {
  // Refine lets each caller select TData, so this unavoidable adapter cast is
  // kept at the single boundary where domain records enter its generic API.
  return value as TData;
}
