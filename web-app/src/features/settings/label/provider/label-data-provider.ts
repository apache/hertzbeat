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
  GetListParams,
  GetListResponse,
  UpdateResponse
} from '@refinedev/core';

import { adaptRefineRecord, adaptRefineRecords } from '@/shared/refine/refine-provider-data';
import { createRefineHttpError, isRefineHttpError, toRefineHttpError } from '@/shared/refine/refine-http-error';

import { labelEndpoint, loadLabels } from '../api/label-api';
import { LabelTransportFailure } from '../api/label-api-failure';
import { LabelRequestFailure } from '../model/label-failure';
import { LabelContractError } from '../model/label-model';
import { assertLabelResource, readLabelDraft, readLabelId, readLabelListQuery } from './label-data-provider-input';
import { deleteAndProveLabel, toLabelRequestFailure, writeAndProveLabel } from './label-data-provider-mutation';

export const labelDataProvider: DataProvider = {
  async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertLabelResource(params.resource);
      const query = readLabelListQuery(params);
      const page = await loadLabels(query);
      return { data: adaptRefineRecords<TData>(page.content), total: page.totalElements };
    });
  },

  getOne(params) {
    return protect(() => {
      assertLabelResource(params.resource);
      throw createRefineHttpError(
        'Label get-one is not supported by the backend contract',
        405,
        'LABEL_GET_ONE_UNSUPPORTED'
      );
    });
  },

  async create<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    variables: TVariables;
  }): Promise<CreateResponse<TData>> {
    return protectMutation(async () => {
      assertLabelResource(params.resource);
      const draft = readLabelDraft(params.variables);
      const canonical = await writeAndProveLabel('create', draft);
      return { data: adaptRefineRecord<TData>(canonical) };
    });
  },

  async update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protectMutation(async () => {
      assertLabelResource(params.resource);
      const id = readLabelId(params.id);
      const draft = { ...readLabelDraft(params.variables), id };
      const canonical = await writeAndProveLabel('update', draft);
      return { data: adaptRefineRecord<TData>(canonical) };
    });
  },

  async deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return protectMutation(async () => {
      assertLabelResource(params.resource);
      const id = readLabelId(params.id);
      const canonical = await deleteAndProveLabel(id, readLabelDraft(params.variables));
      return { data: adaptRefineRecord<TData>(canonical) };
    });
  },

  getApiUrl: () => labelEndpoint
};

async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    if (reason instanceof LabelRequestFailure) throw reason;
    if (reason instanceof LabelTransportFailure || reason instanceof LabelContractError)
      throw toLabelRequestFailure(reason);
    throw toRefineHttpError(reason);
  }
}

async function protectMutation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await protect(operation);
  } catch (reason) {
    // Refine input contracts fail before transport; keep that fact so the
    // controller releases its exclusive write owner instead of retaining proof.
    if (isRefineHttpError(reason) && reason.kind === 'contract' && reason.statusCode === 400) {
      throw new LabelRequestFailure('invalid', 'not-attempted', {
        ...(typeof reason.code === 'string' ? { code: reason.code } : {})
      });
    }
    throw reason;
  }
}
