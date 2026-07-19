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
  loadSystemConfig,
  loadTimezones,
  saveSystemConfig,
  type SystemConfigValue
} from '@/features/settings/system-config/api/system-config-api';
import {
  createSystemConfigResourceRecord,
  createSystemTimezoneResourceRecord,
  SystemConfigResourceContractError,
  systemConfigResourceId
} from '@/features/settings/system-config/model/system-config-model';
import { adaptRefineRecord } from '@/shared/refine/refine-provider-data';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';

const systemConfigResource = 'system-config';
const timezonesUrl = '/api/config/timezones';

export const systemConfigDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(): Promise<GetListResponse<TData>> {
    return rejectUnsupported('SYSTEM_CONFIG_LIST_UNSUPPORTED', 'System Config list is not supported');
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect(async () => {
      assertResourceAndId(params.resource, params.id);
      return { data: adaptRefineRecord<TData>(readConfigRecord(await loadSystemConfig())) };
    });
  },

  create<TData extends BaseRecord = BaseRecord>(): Promise<CreateResponse<TData>> {
    return rejectUnsupported('SYSTEM_CONFIG_CREATE_UNSUPPORTED', 'System Config create is not supported');
  },

  update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protect(async () => {
      assertResourceAndId(params.resource, params.id);
      await saveSystemConfig(readVariables(params.variables));
      const canonical = await loadSystemConfig();
      if (canonical == null) {
        throw createRefineHttpError(
          'System Config canonical reread returned no record',
          502,
          'SYSTEM_CONFIG_CANONICAL_REREAD_MISSING'
        );
      }
      return { data: adaptRefineRecord<TData>(readConfigRecord(canonical)) };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord>(): Promise<DeleteOneResponse<TData>> {
    return rejectUnsupported('SYSTEM_CONFIG_DELETE_UNSUPPORTED', 'System Config delete is not supported');
  },

  custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
    params: CustomParams<TQuery, TPayload>
  ): Promise<CustomResponse<TData>> {
    return protect(async () => {
      if (params.url !== timezonesUrl || params.method !== 'get') {
        throw createRefineHttpError(
          'System Config custom request is not supported',
          400,
          'SYSTEM_CONFIG_CUSTOM_UNSUPPORTED'
        );
      }
      return { data: adaptRefineRecord<TData>(readTimezoneRecord(await loadTimezones())) };
    });
  },

  getApiUrl: () => '/api/config'
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
  if (resource !== systemConfigResource) {
    throw createRefineHttpError('Unsupported System Config resource', 400, 'SYSTEM_CONFIG_RESOURCE_UNSUPPORTED');
  }
  if (id !== systemConfigResourceId) {
    throw createRefineHttpError('System Config id is invalid', 400, 'SYSTEM_CONFIG_ID_INVALID');
  }
}

function readVariables(value: unknown): SystemConfigValue {
  try {
    const record = createSystemConfigResourceRecord(value as SystemConfigValue);
    return { locale: record.locale, timeZoneId: record.timeZoneId, theme: record.theme };
  } catch (reason) {
    if (reason instanceof SystemConfigResourceContractError) {
      throw createRefineHttpError('System Config variables are invalid', 400, 'SYSTEM_CONFIG_VARIABLES_INVALID');
    }
    throw reason;
  }
}

function readConfigRecord(value: SystemConfigValue | null) {
  try {
    return createSystemConfigResourceRecord(value);
  } catch (reason) {
    if (reason instanceof SystemConfigResourceContractError) {
      throw createRefineHttpError('System Config response is invalid', 502, 'SYSTEM_CONFIG_RESPONSE_INVALID');
    }
    throw reason;
  }
}

function readTimezoneRecord(value: Parameters<typeof createSystemTimezoneResourceRecord>[0]) {
  try {
    return createSystemTimezoneResourceRecord(value);
  } catch (reason) {
    if (reason instanceof SystemConfigResourceContractError) {
      throw createRefineHttpError('Timezone response is invalid', 502, 'SYSTEM_TIMEZONES_RESPONSE_INVALID');
    }
    throw reason;
  }
}
