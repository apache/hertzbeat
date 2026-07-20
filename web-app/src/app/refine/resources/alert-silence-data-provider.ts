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
  CustomResponse,
  DataProvider,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneResponse,
  UpdateResponse
} from '@refinedev/core';

import { loadAlertSilence, loadAlertSilences } from '@/features/alert/alert-silence-api';
import {
  AlertSilenceContractError,
  alertSilenceFailureKind,
  type AlertSilence
} from '@/features/alert/alert-silence-model';
import { adaptRefineRecord, adaptRefineRecords } from '@/shared/refine/refine-provider-data';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';
import { readAlertSilenceId, readAlertSilenceListQuery } from './alert-silence-data-provider-input';

export const alertSilenceResourceName = 'alert-silences';

export const alertSilenceDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const query = readAlertSilenceListQuery(params);
      const page = await loadAlertSilences(query);
      return { data: adaptRefineRecords<TData>(page.content), total: page.totalElements };
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
      return { data: adaptRefineRecord<TData>(record) };
    });
  },

  create<TData extends BaseRecord = BaseRecord>(): Promise<CreateResponse<TData>> {
    return unsupported('ALERT_SILENCE_CREATE_UNSUPPORTED');
  },

  update<TData extends BaseRecord = BaseRecord>(): Promise<UpdateResponse<TData>> {
    return unsupported('ALERT_SILENCE_UPDATE_UNSUPPORTED');
  },

  deleteOne<TData extends BaseRecord = BaseRecord>(): Promise<DeleteOneResponse<TData>> {
    return unsupported('ALERT_SILENCE_DELETE_UNSUPPORTED');
  },

  custom<TData extends BaseRecord = BaseRecord>(): Promise<CustomResponse<TData>> {
    return unsupported('ALERT_SILENCE_CUSTOM_ACTION_UNSUPPORTED');
  },

  getApiUrl: () => '/api/alert'
};

async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    const failure = alertSilenceFailureKind(reason);
    if (failure === 'missing') throw contractError('ALERT_SILENCE_MISSING', 404);
    if (reason instanceof AlertSilenceContractError) {
      throw contractError('ALERT_SILENCE_RESPONSE_INVALID');
    }
    if (failure === 'unavailable') {
      throw createRefineHttpError('Alert Silence is unavailable', 503, 'ALERT_SILENCE_UNAVAILABLE', 'http', 503);
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

function contractError(code: string, status = 502) {
  return createRefineHttpError('Alert Silence contract failed', status, code);
}

function unsupported<T>(code: string): Promise<T> {
  return Promise.reject(contractError(code, 405));
}
