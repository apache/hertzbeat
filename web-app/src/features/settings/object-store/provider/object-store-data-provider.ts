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

import { adaptRefineRecord } from '@/shared/refine/refine-provider-data';
import { isRefineHttpError, type RefineHttpError } from '@/shared/refine/refine-http-error';

import { loadObjectStore, objectStoreEndpoint, parseObjectStoreDraft, saveObjectStore } from '../api/object-store-api';
import { normalizeObjectStoreApiFailure, type ObjectStoreRequestPhase } from '../api/object-store-api-failure';
import {
  ObjectStoreRequestFailure,
  type ObjectStoreFailureKind,
  type ObjectStoreWriteOutcome
} from '../model/object-store-failure';
import {
  createObjectStoreResourceRecord,
  ObjectStoreDraftContractError,
  ObjectStoreResourceContractError,
  objectStoreResourceId
} from '../model/object-store-model';

const objectStoreResource = 'object-store';

/** Refine adapter for the Object Store singleton resource. */
export const objectStoreDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(): Promise<GetListResponse<TData>> {
    return Promise.reject(uncertainFailure('OBJECT_STORE_LIST_UNSUPPORTED'));
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
      await saveObjectStore(parseObjectStoreDraft(params.variables));
      const canonical = await readCanonicalObjectStoreAfterWrite();
      if (canonical == null) throw contractFailure('OBJECT_STORE_CANONICAL_REREAD_MISSING');
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
  if (reason instanceof ObjectStoreRequestFailure) {
    if (phase !== 'read' || reason.writeOutcome !== 'rejected') return reason;
    const options = reason.code === undefined ? {} : { code: reason.code };
    return new ObjectStoreRequestFailure(reason.kind, 'uncertain', options);
  }
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
  if (reason.kind === 'network' || (reason.kind === 'http' && (reason.httpStatus ?? 0) >= 500)) {
    return 'unavailable';
  }
  return 'error';
}

function refineWriteOutcome(reason: RefineHttpError, phase: ObjectStoreRequestPhase): ObjectStoreWriteOutcome {
  // Read failures cannot prove whether a separate write committed. For writes,
  // only the source HTTP status is rejection evidence; display status codes and
  // application envelopes may be synthesized after transport completed.
  if (phase === 'read' || reason.kind !== 'http') return 'uncertain';
  return reason.httpStatus !== undefined && reason.httpStatus >= 400 && reason.httpStatus < 500
    ? 'rejected'
    : 'uncertain';
}

function stableObjectStoreCode(code: string | number | undefined) {
  return typeof code === 'string' && code.startsWith('OBJECT_STORE_') ? code : undefined;
}

function rejectUnsupported<T>(code: string): Promise<T> {
  return Promise.reject(rejectedFailure(code));
}

function assertResourceAndId(resource: string, id: string | number) {
  if (resource !== objectStoreResource) throw rejectedFailure('OBJECT_STORE_RESOURCE_UNSUPPORTED');
  if (id !== objectStoreResourceId) throw rejectedFailure('OBJECT_STORE_ID_INVALID');
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
    // POST has already returned. A failed GET is not evidence that the write
    // was rejected, even when that GET itself returned an HTTP 4xx response.
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

function uncertainFailure(code: string) {
  return new ObjectStoreRequestFailure('invalid', 'uncertain', { code });
}
