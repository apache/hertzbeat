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
  GetListResponse,
  GetOneResponse,
  UpdateResponse
} from '@refinedev/core';

import { createRefineHttpError, toRefineHttpError } from '@/shared/refine/refine-http-error';
import { exposeRefineProviderData } from '@/shared/refine/refine-provider-data';

import {
  generateToken,
  loadTokens,
  parseTokenGenerationDraft,
  parseTokenRevokeActionUrl,
  revokeToken,
  TokenApiContractError,
  tokenApiUrl,
  tokenGenerateActionUrl
} from '../api/token-api';
import { tokenResourceName } from '../model/token-model';

export const tokenDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: { resource: string }): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const records = await loadTokens();
      return { data: exposeRefineProviderData<TData[]>(records), total: records.length };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(): Promise<GetOneResponse<TData>> {
    return rejectUnsupported('TOKEN_GET_ONE_UNSUPPORTED', 'Token detail is not supported');
  },

  create<TData extends BaseRecord = BaseRecord>(): Promise<CreateResponse<TData>> {
    return rejectUnsupported('TOKEN_CREATE_UNSUPPORTED', 'Token create is not supported');
  },

  update<TData extends BaseRecord = BaseRecord>(): Promise<UpdateResponse<TData>> {
    return rejectUnsupported('TOKEN_UPDATE_UNSUPPORTED', 'Token update is not supported');
  },

  deleteOne<TData extends BaseRecord = BaseRecord>(): Promise<DeleteOneResponse<TData>> {
    return rejectUnsupported('TOKEN_DELETE_UNSUPPORTED', 'Token delete is not supported');
  },

  custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
    params: CustomParams<TQuery, TPayload>
  ): Promise<CustomResponse<TData>> {
    return protect(async () => {
      if (params.url === tokenGenerateActionUrl && params.method === 'post') {
        const draft = readGenerationDraft(params.payload);
        return { data: exposeRefineProviderData<TData>(await generateToken(draft)) };
      }
      const revokeId = params.method === 'delete' ? parseTokenRevokeActionUrl(params.url) : null;
      if (revokeId !== null) {
        await revokeToken(revokeId);
        return { data: exposeRefineProviderData<TData>({ id: revokeId }) };
      }
      throw createRefineHttpError('Token custom action is not supported', 405, 'TOKEN_CUSTOM_ACTION_UNSUPPORTED');
    });
  },

  getApiUrl: () => tokenApiUrl
};

async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    if (reason instanceof TokenApiContractError) {
      throw createRefineHttpError('Token response is invalid', 502, 'TOKEN_RESPONSE_INVALID');
    }
    throw toRefineHttpError(reason);
  }
}

function readGenerationDraft(value: unknown) {
  try {
    return parseTokenGenerationDraft(value);
  } catch (reason) {
    if (reason instanceof TokenApiContractError) {
      throw createRefineHttpError('Token generation variables are invalid', 400, 'TOKEN_VARIABLES_INVALID');
    }
    throw reason;
  }
}

function rejectUnsupported<T>(code: string, message: string): Promise<T> {
  return Promise.reject(createRefineHttpError(message, 405, code));
}

function assertResource(resource: string) {
  if (resource !== tokenResourceName) {
    throw createRefineHttpError('Unsupported Token resource', 400, 'TOKEN_RESOURCE_UNSUPPORTED');
  }
}
