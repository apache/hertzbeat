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
  DataProvider,
  DeleteOneResponse,
  GetListResponse,
  GetOneResponse,
  UpdateResponse
} from '@refinedev/core';

import {
  loadObjectStore,
  objectStoreEndpoint,
  saveObjectStore
} from '@/features/settings/object-store/api/object-store-api';
import {
  normalizeObjectStoreApiFailure,
  type ObjectStoreRequestPhase
} from '@/features/settings/object-store/api/object-store-api-failure';
import {
  ObjectStoreRequestFailure,
  type ObjectStoreFailureKind,
  type ObjectStoreWriteOutcome
} from '@/features/settings/object-store/model/object-store-failure';
import {
  createObjectStoreResourceRecord,
  ObjectStoreDraftContractError,
  ObjectStoreResourceContractError,
  objectStoreResourceId,
  type ObjectStoreDraft
} from '@/features/settings/object-store/model/object-store-model';
import { adaptRefineRecord } from '@/shared/refine/refine-provider-data';

import { isRefineHttpError, type RefineHttpError } from '../refine-http-error';

const objectStoreResource = 'object-store';

export const objectStoreDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(): Promise<GetListResponse<TData>> {
    return rejectUnsupported('OBJECT_STORE_LIST_UNSUPPORTED');
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect('read', async () => {
      assertResourceAndId(params.resource, params.id);
      const config = await readObjectStore();
      return { data: adaptRefineRecord<TData>(readResourceRecord(config)) };
    });
  },

  create<TData extends BaseRecord = BaseRecord>(): Promise<CreateResponse<TData>> {
    return rejectUnsupported('OBJECT_STORE_CREATE_UNSUPPORTED');
  },

  update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protect('write', async () => {
      assertResourceAndId(params.resource, params.id);
      await saveObjectStore(readDraft(params.variables));
      const canonical = await readCanonicalObjectStoreAfterWrite();
      if (canonical == null) {
        throw contractFailure('OBJECT_STORE_CANONICAL_REREAD_MISSING');
      }
      return { data: adaptRefineRecord<TData>(readResourceRecord(canonical)) };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord>(): Promise<DeleteOneResponse<TData>> {
    return rejectUnsupported('OBJECT_STORE_DELETE_UNSUPPORTED');
  },

  getApiUrl: () => objectStoreEndpoint
};

async function protect<T>(phase: ObjectStoreRequestPhase, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw providerFailure(reason, phase);
  }
}

function providerFailure(reason: unknown, phase: ObjectStoreRequestPhase) {
  if (reason instanceof ObjectStoreRequestFailure) return reason;
  if (reason instanceof ObjectStoreDraftContractError) return rejectedFailure('OBJECT_STORE_VARIABLES_INVALID');
  if (reason instanceof ObjectStoreResourceContractError) return contractFailure('OBJECT_STORE_RESPONSE_INVALID');
  if (isRefineHttpError(reason)) return adaptRefineFailure(reason, phase);
  return normalizeObjectStoreApiFailure(reason, phase);
}

function adaptRefineFailure(reason: RefineHttpError, phase: ObjectStoreRequestPhase) {
  const code = stableObjectStoreCode(reason.code);
  return new ObjectStoreRequestFailure(
    refineFailureKind(reason),
    refineWriteOutcome(reason, phase),
    code ? { code } : {}
  );
}

function refineFailureKind(reason: RefineHttpError): ObjectStoreFailureKind {
  if (typeof reason.code === 'string' && reason.code.startsWith('OBJECT_STORE_')) return 'invalid';
  if (reason.statusCode === 0 || reason.kind === 'network' || reason.statusCode >= 500) return 'unavailable';
  return 'error';
}

function refineWriteOutcome(reason: RefineHttpError, phase: ObjectStoreRequestPhase): ObjectStoreWriteOutcome {
  // Read failures never provide evidence about whether a separate write committed.
  if (phase === 'read') return 'uncertain';
  if (reason.kind === 'envelope') return 'rejected';
  return reason.statusCode >= 400 && reason.statusCode < 500 ? 'rejected' : 'uncertain';
}

function stableObjectStoreCode(code: string | number | undefined) {
  return typeof code === 'string' && code.startsWith('OBJECT_STORE_') ? code : undefined;
}

function rejectUnsupported<T>(code: string): Promise<T> {
  return Promise.reject(rejectedFailure(code));
}

function assertResourceAndId(resource: string, id: string | number) {
  if (resource !== objectStoreResource) {
    throw rejectedFailure('OBJECT_STORE_RESOURCE_UNSUPPORTED');
  }
  if (id !== objectStoreResourceId) {
    throw rejectedFailure('OBJECT_STORE_ID_INVALID');
  }
}

function readDraft(value: unknown): ObjectStoreDraft {
  if (!value || typeof value !== 'object' || !('type' in value) || !('config' in value)) {
    throw rejectedFailure('OBJECT_STORE_VARIABLES_INVALID');
  }
  const { config, type } = value;
  if (type !== 'DATABASE' && type !== 'FILE' && type !== 'OBS') throw rejectedFailure('OBJECT_STORE_VARIABLES_INVALID');
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw rejectedFailure('OBJECT_STORE_VARIABLES_INVALID');
  }
  return { type, config };
}

async function readObjectStore() {
  try {
    return await loadObjectStore();
  } catch (reason) {
    if (reason instanceof ObjectStoreResourceContractError) {
      throw contractFailure('OBJECT_STORE_RESPONSE_INVALID');
    }
    throw reason;
  }
}

async function readCanonicalObjectStoreAfterWrite() {
  try {
    return await readObjectStore();
  } catch {
    // The POST already returned successfully. A failed GET cannot prove that
    // the write was rejected, even when the GET itself returned a 4xx status.
    throw contractFailure('OBJECT_STORE_CANONICAL_REREAD_FAILED');
  }
}

function readResourceRecord(value: Parameters<typeof createObjectStoreResourceRecord>[0]) {
  try {
    return createObjectStoreResourceRecord(value);
  } catch (reason) {
    if (reason instanceof ObjectStoreResourceContractError) {
      throw contractFailure('OBJECT_STORE_RESPONSE_INVALID');
    }
    throw reason;
  }
}

function contractFailure(code: string) {
  return new ObjectStoreRequestFailure('invalid', 'uncertain', { code });
}

function rejectedFailure(code: string) {
  return new ObjectStoreRequestFailure('invalid', 'rejected', { code });
}
