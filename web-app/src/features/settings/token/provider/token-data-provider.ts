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

import { isRefineHttpError, type RefineHttpError } from '@/shared/refine/refine-http-error';
import { adaptRefineRecord, adaptRefineRecords } from '@/shared/refine/refine-provider-data';
import { isDefiniteRefineWriteRejection, isRefineSourceUnavailable } from '@/shared/refine/refine-source-evidence';

import { normalizeTokenApiFailure, type TokenRequestPhase } from '../api/token-api-failure';
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
import { TokenRequestFailure, type TokenFailureKind, type TokenWriteOutcome } from '../model/token-failure';
import { tokenResourceName } from '../model/token-model';

export const tokenDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: { resource: string }): Promise<GetListResponse<TData>> {
    return protect('collection', async () => {
      assertResource(params.resource);
      const records = await loadTokens();
      return { data: adaptRefineRecords<TData>(records), total: records.length };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(): Promise<GetOneResponse<TData>> {
    return rejectUnsupported('TOKEN_GET_ONE_UNSUPPORTED');
  },

  create<TData extends BaseRecord = BaseRecord>(): Promise<CreateResponse<TData>> {
    return rejectUnsupported('TOKEN_CREATE_UNSUPPORTED');
  },

  update<TData extends BaseRecord = BaseRecord>(): Promise<UpdateResponse<TData>> {
    return rejectUnsupported('TOKEN_UPDATE_UNSUPPORTED');
  },

  deleteOne<TData extends BaseRecord = BaseRecord>(): Promise<DeleteOneResponse<TData>> {
    return rejectUnsupported('TOKEN_DELETE_UNSUPPORTED');
  },

  custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
    params: CustomParams<TQuery, TPayload>
  ): Promise<CustomResponse<TData>> {
    return protect('write', async () => {
      if (params.url === tokenGenerateActionUrl && params.method === 'post') {
        const draft = readGenerationDraft(params.payload);
        return { data: adaptRefineRecord<TData>(await generateToken(draft)) };
      }
      const revokeId = params.method === 'delete' ? parseTokenRevokeActionUrl(params.url) : null;
      if (revokeId !== null) {
        return { data: adaptRefineRecord<TData>(await revokeToken(revokeId)) };
      }
      throw rejectedFailure('TOKEN_CUSTOM_ACTION_UNSUPPORTED');
    });
  },

  getApiUrl: () => tokenApiUrl
};

async function protect<T>(phase: TokenRequestPhase, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw providerFailure(reason, phase);
  }
}

function providerFailure(reason: unknown, phase: TokenRequestPhase) {
  if (reason instanceof TokenRequestFailure) return normalizeTokenApiFailure(reason, phase);
  if (reason instanceof TokenApiContractError) return contractFailure('TOKEN_RESPONSE_INVALID');
  if (isRefineHttpError(reason)) return adaptRefineFailure(reason, phase);
  return normalizeTokenApiFailure(reason, phase);
}

function adaptRefineFailure(reason: RefineHttpError, phase: TokenRequestPhase) {
  const code = stableTokenCode(reason.code);
  return new TokenRequestFailure(refineFailureKind(reason), refineWriteOutcome(reason, phase), code ? { code } : {});
}

function refineFailureKind(reason: RefineHttpError): TokenFailureKind {
  if (isRefineSourceUnavailable(reason)) return 'unavailable';
  if (typeof reason.code === 'string' && reason.code.startsWith('TOKEN_')) return 'invalid';
  return 'error';
}

function refineWriteOutcome(reason: RefineHttpError, phase: TokenRequestPhase): TokenWriteOutcome {
  // Refine's statusCode is display metadata. Only a source HTTP write response
  // can prove rejection; reads, network causes, and timeouts remain uncertain.
  if (phase === 'collection') return 'uncertain';
  return isDefiniteRefineWriteRejection(reason) ? 'rejected' : 'uncertain';
}

function stableTokenCode(code: string | number | undefined) {
  return typeof code === 'string' && code.startsWith('TOKEN_') ? code : undefined;
}

function readGenerationDraft(value: unknown) {
  try {
    return parseTokenGenerationDraft(value);
  } catch (reason) {
    if (reason instanceof TokenApiContractError) {
      throw rejectedFailure('TOKEN_VARIABLES_INVALID');
    }
    throw reason;
  }
}

function rejectUnsupported<T>(code: string): Promise<T> {
  return Promise.reject(rejectedFailure(code));
}

function assertResource(resource: string) {
  if (resource !== tokenResourceName) {
    throw rejectedFailure('TOKEN_RESOURCE_UNSUPPORTED');
  }
}

function contractFailure(code: string) {
  return new TokenRequestFailure('invalid', 'uncertain', { code });
}

function rejectedFailure(code: string) {
  return new TokenRequestFailure('invalid', 'rejected', { code });
}
