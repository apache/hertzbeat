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
import type { NoticeTemplateRequestPhase } from '@/features/alert/api/notice-template-api-failure';
import { NoticeTemplateRequestFailure } from '@/features/alert/model/notice-template-failure';
import {
  noticeTemplateResourceRecord,
  type NoticeTemplate,
  type NoticeTemplateQuery
} from '@/features/alert/notice-template-model';
import { noticeApiEndpoint } from '@/features/alert/notice-api-endpoints';
import { noticeTemplateCreateActionUrl, noticeTemplateResourceName } from '@/features/alert/notice-template-resource';
import { adaptRefineRecord, adaptRefineRecords } from '@/shared/refine/refine-provider-data';

import {
  normalizeNoticeTemplateProviderFailure,
  readNoticeTemplateWriteInput
} from './notice-template-data-provider-failure';
import {
  readNoticeTemplateDeleteVariables,
  readNoticeTemplateDraft,
  readNoticeTemplateId,
  readNoticeTemplateListQuery
} from './notice-template-data-provider-input';

export const noticeTemplateDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect('collection', async () => {
      assertResource(params.resource);
      const query = readNoticeTemplateListQuery(params);
      const page = await loadNoticeTemplates(query);
      assertPageEvidence(page, query);
      const records = mapResourceRecords(page.content);
      return { data: adaptRefineRecords<TData>(records), total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect('detail', async () => {
      assertResource(params.resource);
      const id = readNoticeTemplateId(params.id);
      const record = await loadNoticeTemplate(id);
      assertCanonicalCustom(record, id);
      return { data: adaptRefineRecord<TData>(noticeTemplateResourceRecord(record)) };
    });
  },

  create<TData extends BaseRecord = BaseRecord>(): Promise<CreateResponse<TData>> {
    return Promise.reject(rejectedFailure('NOTICE_TEMPLATE_CREATE_UNSUPPORTED'));
  },

  update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protect('write', async () => {
      assertResource(params.resource);
      const { draft, id } = readNoticeTemplateWriteInput(() => {
        const id = readNoticeTemplateId(params.id);
        return { draft: readNoticeTemplateDraft(params.variables, id), id };
      });
      await saveNoticeTemplate(draft);
      const acknowledged = noticeTemplateResourceRecord({ ...draft, id, preset: false });
      return { data: adaptRefineRecord<TData>(acknowledged) };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return protect('write', async () => {
      assertResource(params.resource);
      const { id, record } = readNoticeTemplateWriteInput(() => {
        const id = readNoticeTemplateId(params.id);
        return { id, ...readNoticeTemplateDeleteVariables(params.variables, id) };
      });
      await deleteNoticeTemplate(id);
      return { data: adaptRefineRecord<TData>(record) };
    });
  },

  custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
    params: CustomParams<TQuery, TPayload>
  ): Promise<CustomResponse<TData>> {
    return protect('write', async () => {
      if (params.url !== noticeTemplateCreateActionUrl || params.method !== 'post') {
        throw rejectedFailure('NOTICE_TEMPLATE_CUSTOM_ACTION_UNSUPPORTED');
      }
      const draft = readNoticeTemplateWriteInput(() => readNoticeTemplateDraft(params.payload));
      if (draft.id !== undefined) throw rejectedFailure('NOTICE_TEMPLATE_VARIABLES_INVALID');
      const response = await saveNoticeTemplate(draft);
      return { data: adaptRefineRecord<TData>({ response }) };
    });
  },

  getApiUrl: () => noticeApiEndpoint
};

async function protect<T>(phase: NoticeTemplateRequestPhase, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw normalizeNoticeTemplateProviderFailure(reason, phase);
  }
}

function assertResource(resource: string) {
  if (resource !== noticeTemplateResourceName) {
    throw rejectedFailure('NOTICE_TEMPLATE_RESOURCE_UNSUPPORTED');
  }
}

function assertCanonicalCustom(record: NoticeTemplate, id: number) {
  if (record.id !== id || record.preset) {
    throw contractFailure('NOTICE_TEMPLATE_CANONICAL_IDENTITY_INVALID');
  }
}

function mapResourceRecords(templates: NoticeTemplate[]) {
  const records = templates.map(noticeTemplateResourceRecord);
  const ids = new Set(records.map(record => record.id));
  if (ids.size !== records.length) {
    throw contractFailure('NOTICE_TEMPLATE_RESOURCE_ID_COLLISION');
  }
  return records;
}

function assertPageEvidence(page: Awaited<ReturnType<typeof loadNoticeTemplates>>, query: NoticeTemplateQuery) {
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw contractFailure('NOTICE_TEMPLATE_PAGE_MISMATCH');
  }
  if (page.totalElements < page.content.length) {
    throw contractFailure('NOTICE_TEMPLATE_TOTAL_INVALID');
  }
  if (page.content.length > page.size) {
    throw contractFailure('NOTICE_TEMPLATE_PAGE_CONTENT_INVALID');
  }
}

function contractFailure(code: string) {
  return new NoticeTemplateRequestFailure('invalid', 'uncertain', { code });
}

function rejectedFailure(code: string) {
  return new NoticeTemplateRequestFailure('invalid', 'rejected', { code });
}
