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

import {
  generateToken,
  loadTokens,
  revokeToken
} from '@/features/settings/token/api/token-api';
import {
  createGeneratedTokenReceipt,
  createTokenGenerationDraft,
  createTokenResourceRecords,
  tokenApiUrl,
  tokenGenerateActionUrl,
  tokenResourceName,
  TokenResourceContractError
} from '@/features/settings/token/model/token-model';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';

export { tokenGenerateActionUrl, tokenRevokeActionUrl } from '@/features/settings/token/model/token-model';

export const tokenDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
  }): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const records = readList(await loadTokens());
      return { data: records as unknown as TData[], total: records.length };
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
        const draft = readDraft(params.payload);
        const receipt = readReceipt(await generateToken(draft));
        return { data: receipt as unknown as TData };
      }
      const revokeId = readRevokeId(params.url, params.method);
      if (revokeId !== null) {
        await revokeToken(revokeId);
        return { data: { id: revokeId } as TData };
      }
      throw createRefineHttpError(
        'Token custom action is not supported',
        405,
        'TOKEN_CUSTOM_ACTION_UNSUPPORTED'
      );
    });
  },

  getApiUrl: () => tokenApiUrl
};

async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw toRefineHttpError(reason);
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

function readList(value: unknown) {
  try {
    return createTokenResourceRecords(value);
  } catch (reason) {
    throw translateContractError(reason, 'Token list response is invalid', 'TOKEN_RESPONSE_INVALID', 502);
  }
}

function readReceipt(value: unknown) {
  try {
    return createGeneratedTokenReceipt(value);
  } catch (reason) {
    throw translateContractError(reason, 'Generated Token response is invalid', 'TOKEN_RESPONSE_INVALID', 502);
  }
}

function readDraft(value: unknown) {
  try {
    return createTokenGenerationDraft(value);
  } catch (reason) {
    throw translateContractError(reason, 'Token generation variables are invalid', 'TOKEN_VARIABLES_INVALID', 400);
  }
}

function translateContractError(reason: unknown, message: string, code: string, status: number) {
  return reason instanceof TokenResourceContractError
    ? createRefineHttpError(message, status, code)
    : reason;
}

function readRevokeId(url: string, method: CustomParams['method']) {
  if (method !== 'delete') return null;
  const match = /^\/api\/account\/token\/([1-9]\d*)$/.exec(url);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}
