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

import { deleteLabel, findCanonicalLabel, loadLabels, saveLabel } from '@/features/settings/label/api/label-api';
import { LabelContractError, type LabelIdentity, type LabelRecord } from '@/features/settings/label/model/label-model';
import { isLabelPageSize } from '@/features/settings/label/model/label-query-model';
import { exposeRefineProviderData } from '@/shared/refine/refine-provider-data';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';

const labelResource = 'labels';

export const labelDataProvider: DataProvider = {
  async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertLabelResource(params.resource);
      const query = readListQuery(params);
      const page = await loadLabels(query);
      return { data: exposeRefineProviderData<TData[]>(page.content), total: page.totalElements };
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
    return protect(async () => {
      assertLabelResource(params.resource);
      const draft = readLabelDraft(params.variables);
      await saveLabel(draft, true);
      const canonical = await requireCanonicalLabel(toIdentity(draft));
      return { data: exposeRefineProviderData<TData>(canonical) };
    });
  },

  async update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protect(async () => {
      assertLabelResource(params.resource);
      const id = readLabelId(params.id);
      const draft = { ...readLabelDraft(params.variables), id };
      await saveLabel(draft, false);
      const canonical = await requireCanonicalLabel(toIdentity(draft));
      return { data: exposeRefineProviderData<TData>(canonical) };
    });
  },

  async deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return protect(async () => {
      assertLabelResource(params.resource);
      const id = readLabelId(params.id);
      const identity = toIdentity(readLabelDraft(params.variables), id);
      const canonical = await requireCanonicalLabel(identity);
      await deleteLabel(id);
      if (await findCanonicalLabel(identity)) {
        throw createRefineHttpError('Label deletion could not be confirmed', 502, 'LABEL_DELETE_NOT_CONFIRMED');
      }
      return { data: exposeRefineProviderData<TData>(canonical) };
    });
  },

  getApiUrl: () => '/api/label'
};

async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    if (reason instanceof LabelContractError) {
      throw createRefineHttpError('Label response is invalid', 502, reason.code);
    }
    throw toRefineHttpError(reason);
  }
}

function assertLabelResource(resource: string) {
  if (resource !== labelResource) {
    throw createRefineHttpError('Unsupported Label resource', 400, 'LABEL_RESOURCE_UNSUPPORTED');
  }
}

function readListQuery(params: GetListParams) {
  assertNoSorters(params.sorters);
  const { currentPage, pageSize } = readPagination(params.pagination);
  return { search: readSearchFilter(params.filters), pageIndex: currentPage - 1, pageSize };
}

function assertNoSorters(sorters: GetListParams['sorters']) {
  if (sorters && sorters.length > 0) {
    throw createRefineHttpError('Label sorting is not supported', 400, 'LABEL_SORT_UNSUPPORTED');
  }
}

function readPagination(pagination: GetListParams['pagination']) {
  if (pagination?.mode && pagination.mode !== 'server') {
    throw createRefineHttpError('Label pagination mode is not supported', 400, 'LABEL_PAGINATION_UNSUPPORTED');
  }
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? 20;
  if (!Number.isInteger(currentPage) || currentPage < 1 || !isLabelPageSize(pageSize)) {
    throw createRefineHttpError('Label pagination is invalid', 400, 'LABEL_PAGINATION_INVALID');
  }
  return { currentPage, pageSize };
}

function readSearchFilter(filters: GetListParams['filters']) {
  if (!filters || filters.length === 0) return '';
  const [filter] = filters;
  if (
    filters.length !== 1 ||
    !filter ||
    !('field' in filter) ||
    filter.field !== 'search' ||
    filter.operator !== 'contains' ||
    typeof filter.value !== 'string'
  ) {
    throw createRefineHttpError('Label filter is not supported', 400, 'LABEL_FILTER_UNSUPPORTED');
  }
  return filter.value.trim();
}

function readLabelDraft(value: unknown): Partial<LabelRecord> & Pick<LabelRecord, 'name'> {
  if (!value || typeof value !== 'object') {
    throw createRefineHttpError('Label variables are invalid', 400, 'LABEL_VARIABLES_INVALID');
  }
  const draft = value as Partial<LabelRecord>;
  if (typeof draft.name !== 'string' || !draft.name.trim()) {
    throw createRefineHttpError('Label variables are invalid', 400, 'LABEL_VARIABLES_INVALID');
  }
  if (draft.tagValue !== undefined && typeof draft.tagValue !== 'string') {
    throw createRefineHttpError('Label variables are invalid', 400, 'LABEL_VARIABLES_INVALID');
  }
  return draft as Partial<LabelRecord> & Pick<LabelRecord, 'name'>;
}

function readLabelId(value: string | number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw createRefineHttpError('Label id is invalid', 400, 'LABEL_ID_INVALID');
  }
  return value;
}

function toIdentity(label: LabelIdentity, id?: number): LabelIdentity {
  const canonicalId = id ?? label.id;
  return {
    ...(canonicalId === undefined ? {} : { id: canonicalId }),
    name: label.name.trim(),
    tagValue: label.tagValue?.trim() ?? ''
  };
}

async function requireCanonicalLabel(identity: LabelIdentity) {
  const canonical = await findCanonicalLabel(identity);
  if (!canonical) {
    throw createRefineHttpError(
      'Label canonical reread returned no matching server record',
      502,
      'LABEL_CANONICAL_REREAD_MISSING'
    );
  }
  return canonical;
}
