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

import { loadObjectStore, saveObjectStore } from '@/features/settings/object-store/api/object-store-api';
import {
  createObjectStoreResourceRecord,
  ObjectStoreResourceContractError,
  objectStoreResourceId,
  type ObjectStoreDraft
} from '@/features/settings/object-store/model/object-store-model';
import { adaptRefineRecord } from '@/shared/refine/refine-provider-data';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';

const objectStoreResource = 'object-store';

export const objectStoreDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(): Promise<GetListResponse<TData>> {
    return rejectUnsupported('OBJECT_STORE_LIST_UNSUPPORTED', 'Object Store list is not supported');
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect(async () => {
      assertResourceAndId(params.resource, params.id);
      const config = await readObjectStore();
      return { data: adaptRefineRecord<TData>(readResourceRecord(config)) };
    });
  },

  create<TData extends BaseRecord = BaseRecord>(): Promise<CreateResponse<TData>> {
    return rejectUnsupported('OBJECT_STORE_CREATE_UNSUPPORTED', 'Object Store create is not supported');
  },

  update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protect(async () => {
      assertResourceAndId(params.resource, params.id);
      await saveObjectStore(readDraft(params.variables));
      const canonical = await readCanonicalObjectStoreAfterWrite();
      if (canonical == null) {
        throw createRefineHttpError(
          'Object Store canonical reread returned no record',
          502,
          'OBJECT_STORE_CANONICAL_REREAD_MISSING'
        );
      }
      return { data: adaptRefineRecord<TData>(readResourceRecord(canonical)) };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord>(): Promise<DeleteOneResponse<TData>> {
    return rejectUnsupported('OBJECT_STORE_DELETE_UNSUPPORTED', 'Object Store delete is not supported');
  },

  getApiUrl: () => '/api/config/oss'
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

function assertResourceAndId(resource: string, id: string | number) {
  if (resource !== objectStoreResource) {
    throw createRefineHttpError('Unsupported Object Store resource', 400, 'OBJECT_STORE_RESOURCE_UNSUPPORTED');
  }
  if (id !== objectStoreResourceId) {
    throw createRefineHttpError('Object Store id is invalid', 400, 'OBJECT_STORE_ID_INVALID');
  }
}

function readDraft(value: unknown): ObjectStoreDraft {
  if (!value || typeof value !== 'object') {
    throw createRefineHttpError('Object Store variables are invalid', 400, 'OBJECT_STORE_VARIABLES_INVALID');
  }
  const draft = value as Partial<ObjectStoreDraft>;
  if (draft.type !== 'DATABASE' && draft.type !== 'FILE' && draft.type !== 'OBS') {
    throw createRefineHttpError('Object Store variables are invalid', 400, 'OBJECT_STORE_VARIABLES_INVALID');
  }
  if (!draft.config || typeof draft.config !== 'object' || Array.isArray(draft.config)) {
    throw createRefineHttpError('Object Store variables are invalid', 400, 'OBJECT_STORE_VARIABLES_INVALID');
  }
  return { type: draft.type, config: draft.config };
}

async function readObjectStore() {
  try {
    return await loadObjectStore();
  } catch (reason) {
    if (reason instanceof ObjectStoreResourceContractError) {
      throw createRefineHttpError('Object Store response is invalid', 502, 'OBJECT_STORE_RESPONSE_INVALID');
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
    throw createRefineHttpError('Object Store canonical reread failed', 502, 'OBJECT_STORE_CANONICAL_REREAD_FAILED');
  }
}

function readResourceRecord(value: Parameters<typeof createObjectStoreResourceRecord>[0]) {
  try {
    return createObjectStoreResourceRecord(value);
  } catch (reason) {
    if (reason instanceof ObjectStoreResourceContractError) {
      throw createRefineHttpError('Object Store response is invalid', 502, 'OBJECT_STORE_RESPONSE_INVALID');
    }
    throw reason;
  }
}
