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
  type NoticeTemplate,
  type NoticeTemplateQuery
} from '@/features/alert/notice-template-model';
import { noticeTemplateCreateActionUrl, noticeTemplateResourceName } from '@/features/alert/notice-template-resource';
import { exposeRefineProviderData } from '@/shared/refine/refine-provider-data';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';
import {
  readNoticeTemplateDeleteVariables,
  readNoticeTemplateDraft,
  readNoticeTemplateId,
  readNoticeTemplateListQuery
} from './notice-template-data-provider-input';

export const noticeTemplateDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const query = readNoticeTemplateListQuery(params);
      const page = await loadNoticeTemplates(query);
      assertPageEvidence(page, query);
      const records = mapResourceRecords(page.content);
      return { data: exposeRefineProviderData<TData[]>(records), total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readNoticeTemplateId(params.id);
      const record = await loadNoticeTemplate(id);
      assertCanonicalCustom(record, id);
      return { data: exposeRefineProviderData<TData>(noticeTemplateResourceRecord(record)) };
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
      const id = readNoticeTemplateId(params.id);
      const draft = readNoticeTemplateDraft(params.variables, id);
      await saveNoticeTemplate(draft);
      const canonical = await loadNoticeTemplate(id);
      assertCanonicalCustom(canonical, id);
      return { data: exposeRefineProviderData<TData>(noticeTemplateResourceRecord(canonical)) };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readNoticeTemplateId(params.id);
      const { query } = readNoticeTemplateDeleteVariables(params.variables, id);
      const canonical = await loadNoticeTemplate(id);
      if (canonical.id !== id || canonical.preset) throw contractError('NOTICE_TEMPLATE_DELETE_FORBIDDEN', 400);
      await deleteNoticeTemplate(id);
      const proof = await loadNoticeTemplates(query);
      assertPageEvidence(proof, query);
      if (proof.content.some(item => item.id === id)) {
        throw contractError('NOTICE_TEMPLATE_DELETE_NOT_CONFIRMED');
      }
      return { data: exposeRefineProviderData<TData>(noticeTemplateResourceRecord(canonical)) };
    });
  },

  custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
    params: CustomParams<TQuery, TPayload>
  ): Promise<CustomResponse<TData>> {
    return protect(async () => {
      if (params.url !== noticeTemplateCreateActionUrl || params.method !== 'post') {
        throw contractError('NOTICE_TEMPLATE_CUSTOM_ACTION_UNSUPPORTED', 405);
      }
      const draft = readNoticeTemplateDraft(params.payload);
      if (draft.id !== undefined) throw contractError('NOTICE_TEMPLATE_VARIABLES_INVALID', 400);
      await saveNoticeTemplate(draft);
      return { data: exposeRefineProviderData<TData>({ acknowledged: true }) };
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

function assertCanonicalCustom(record: NoticeTemplate, id: number) {
  if (record.id !== id || record.preset) {
    throw contractError('NOTICE_TEMPLATE_CANONICAL_IDENTITY_INVALID');
  }
}

function mapResourceRecords(templates: NoticeTemplate[]) {
  const records = templates.map(noticeTemplateResourceRecord);
  const ids = new Set(records.map(record => record.id));
  if (ids.size !== records.length) {
    throw contractError('NOTICE_TEMPLATE_RESOURCE_ID_COLLISION');
  }
  return records;
}

function assertPageEvidence(page: Awaited<ReturnType<typeof loadNoticeTemplates>>, query: NoticeTemplateQuery) {
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
