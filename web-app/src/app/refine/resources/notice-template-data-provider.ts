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
  GetListParams,
  GetListResponse,
  GetOneResponse,
  UpdateResponse
} from '@refinedev/core';

import {
  deleteNoticeTemplate,
  loadNoticeTemplate,
  loadNoticeTemplates,
  saveNoticeTemplate
} from '@/features/alert/notice-template-api';
import {
  NoticeTemplateContractError,
  noticeTemplateResourceRecord,
  noticeTemplatePageSizes,
  validateNoticeTemplateDraft,
  type NoticeTemplate,
  type NoticeTemplateDraft,
  type NoticeTemplateQuery,
  type NoticeTemplateResourceRecord
} from '@/features/alert/notice-template-model';
import {
  noticeTemplateCreateActionUrl,
  noticeTemplateResourceName
} from '@/features/alert/notice-template-resource';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';

export { noticeTemplateCreateActionUrl, noticeTemplateResourceName } from '@/features/alert/notice-template-resource';

type DeleteVariables = { record: NoticeTemplateResourceRecord; query: NoticeTemplateQuery };

export const noticeTemplateDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const query = readListQuery(params);
      const page = await loadNoticeTemplates(query);
      assertPageEvidence(page, query);
      const records = mapResourceRecords(page.content);
      return { data: records as unknown as TData[], total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      const record = await loadNoticeTemplate(id);
      assertCanonicalCustom(record, id);
      return { data: noticeTemplateResourceRecord(record) as unknown as TData };
    });
  },

  create<TData extends BaseRecord = BaseRecord>(): Promise<CreateResponse<TData>> {
    return Promise.reject(contractError('NOTICE_TEMPLATE_CREATE_UNSUPPORTED', 405));
  },

  update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      const draft = readDraft(params.variables, id);
      await saveNoticeTemplate(draft);
      const canonical = await loadNoticeTemplate(id);
      assertCanonicalCustom(canonical, id);
      return { data: noticeTemplateResourceRecord(canonical) as unknown as TData };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      const { query } = readDeleteVariables(params.variables, id);
      const canonical = await loadNoticeTemplate(id);
      if (canonical.id !== id || canonical.preset) throw contractError('NOTICE_TEMPLATE_DELETE_FORBIDDEN', 400);
      await deleteNoticeTemplate(id);
      const proof = await loadNoticeTemplates(query);
      assertPageEvidence(proof, query);
      if (proof.content.some(item => item.id === id)) {
        throw contractError('NOTICE_TEMPLATE_DELETE_NOT_CONFIRMED');
      }
      return { data: noticeTemplateResourceRecord(canonical) as unknown as TData };
    });
  },

  custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
    params: CustomParams<TQuery, TPayload>
  ): Promise<CustomResponse<TData>> {
    return protect(async () => {
      if (params.url !== noticeTemplateCreateActionUrl || params.method !== 'post') {
        throw contractError('NOTICE_TEMPLATE_CUSTOM_ACTION_UNSUPPORTED', 405);
      }
      const draft = readDraft(params.payload);
      if (draft.id !== undefined) throw contractError('NOTICE_TEMPLATE_VARIABLES_INVALID', 400);
      await saveNoticeTemplate(draft);
      return { data: { acknowledged: true } as unknown as TData };
    });
  },

  getApiUrl: () => '/api/notice'
};

async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    if (reason instanceof NoticeTemplateContractError) {
      throw contractError('NOTICE_TEMPLATE_RESPONSE_INVALID');
    }
    throw toRefineHttpError(reason);
  }
}

function assertResource(resource: string) {
  if (resource !== noticeTemplateResourceName) {
    throw contractError('NOTICE_TEMPLATE_RESOURCE_UNSUPPORTED', 400);
  }
}

function readListQuery(params: GetListParams): NoticeTemplateQuery {
  assertNoSorters(params.sorters);
  const pagination = readPagination(params.pagination);
  return { ...readFilters(params.filters), ...pagination };
}

function assertNoSorters(sorters: GetListParams['sorters']) {
  if (sorters && sorters.length > 0) throw contractError('NOTICE_TEMPLATE_SORT_UNSUPPORTED', 400);
}

function readPagination(pagination: GetListParams['pagination']) {
  if (pagination?.mode && pagination.mode !== 'server') {
    throw contractError('NOTICE_TEMPLATE_PAGINATION_UNSUPPORTED', 400);
  }
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? 8;
  if (
    !Number.isSafeInteger(currentPage)
    || currentPage < 1
    || !noticeTemplatePageSizes.includes(pageSize as (typeof noticeTemplatePageSizes)[number])
  ) {
    throw contractError('NOTICE_TEMPLATE_PAGINATION_INVALID', 400);
  }
  return { pageIndex: currentPage - 1, pageSize };
}

function readFilters(filters: GetListParams['filters']): Pick<NoticeTemplateQuery, 'name' | 'preset'> {
  let name = '';
  let preset: boolean | undefined;
  for (const filter of filters ?? []) {
    if (!('field' in filter)) throw contractError('NOTICE_TEMPLATE_FILTER_UNSUPPORTED', 400);
    if (filter.field === 'name' && filter.operator === 'contains' && typeof filter.value === 'string') {
      name = filter.value.trim();
    } else if (filter.field === 'preset' && filter.operator === 'eq' && typeof filter.value === 'boolean') {
      preset = filter.value;
    } else {
      throw contractError('NOTICE_TEMPLATE_FILTER_UNSUPPORTED', 400);
    }
  }
  if (preset === undefined) throw contractError('NOTICE_TEMPLATE_FILTER_UNSUPPORTED', 400);
  return { name, preset };
}

function readId(value: string | number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw contractError('NOTICE_TEMPLATE_ID_INVALID', 400);
  }
  return value;
}

function assertCanonicalCustom(record: NoticeTemplate, id: number) {
  if (record.id !== id || record.preset) {
    throw contractError('NOTICE_TEMPLATE_CANONICAL_IDENTITY_INVALID');
  }
}

function readDraft(value: unknown, id?: number): NoticeTemplateDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('NOTICE_TEMPLATE_VARIABLES_INVALID', 400);
  }
  const candidate = value as Partial<NoticeTemplateDraft>;
  const draft = {
    ...(id === undefined ? {} : { id }),
    name: candidate.name,
    type: candidate.type,
    content: candidate.content
  } as NoticeTemplateDraft;
  if (
    typeof draft.name !== 'string'
    || typeof draft.type !== 'number'
    || typeof draft.content !== 'string'
    || validateNoticeTemplateDraft(draft).length > 0
    || (candidate.id !== undefined && candidate.id !== id)
  ) {
    throw contractError('NOTICE_TEMPLATE_VARIABLES_INVALID', 400);
  }
  return draft;
}

function readDeleteVariables(value: unknown, id: number): DeleteVariables {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('NOTICE_TEMPLATE_VARIABLES_INVALID', 400);
  }
  const candidate = value as Partial<DeleteVariables>;
  if (
    !candidate.record
    || candidate.record.preset
    || candidate.record.backendId !== id
    || candidate.record.id !== `notice-template:custom:${id}`
    || !candidate.query
  ) {
    throw contractError('NOTICE_TEMPLATE_DELETE_FORBIDDEN', 400);
  }
  return { record: candidate.record, query: readDeleteQuery(candidate.query) };
}

function mapResourceRecords(templates: NoticeTemplate[]) {
  const records = templates.map(noticeTemplateResourceRecord);
  const ids = new Set(records.map(record => record.id));
  if (ids.size !== records.length) {
    throw contractError('NOTICE_TEMPLATE_RESOURCE_ID_COLLISION');
  }
  return records;
}

function readDeleteQuery(query: NoticeTemplateQuery): NoticeTemplateQuery {
  if (
    typeof query.name !== 'string'
    || typeof query.preset !== 'boolean'
    || !Number.isSafeInteger(query.pageIndex)
    || query.pageIndex < 0
    || !noticeTemplatePageSizes.includes(query.pageSize as (typeof noticeTemplatePageSizes)[number])
  ) {
    throw contractError('NOTICE_TEMPLATE_VARIABLES_INVALID', 400);
  }
  return { ...query };
}

function assertPageEvidence(
  page: Awaited<ReturnType<typeof loadNoticeTemplates>>,
  query: NoticeTemplateQuery
) {
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw contractError('NOTICE_TEMPLATE_PAGE_MISMATCH');
  }
  if (page.totalElements < page.content.length) {
    throw contractError('NOTICE_TEMPLATE_TOTAL_INVALID');
  }
  if (page.content.length > page.size) {
    throw contractError('NOTICE_TEMPLATE_PAGE_CONTENT_INVALID');
  }
}

function contractError(code: string, status = 502) {
  return createRefineHttpError('Notice Template contract failed', status, code);
}
