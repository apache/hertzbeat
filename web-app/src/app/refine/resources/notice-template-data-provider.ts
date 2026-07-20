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
  normalizeNoticeTemplateApiFailure,
  type NoticeTemplateRequestPhase
} from '@/features/alert/api/notice-template-api-failure';
import {
  NoticeTemplateRequestFailure,
  type NoticeTemplateFailureKind,
  type NoticeTemplateWriteOutcome
} from '@/features/alert/model/notice-template-failure';
import {
  NoticeTemplateContractError,
  noticeTemplateResourceRecord,
  type NoticeTemplate,
  type NoticeTemplateQuery
} from '@/features/alert/notice-template-model';
import { noticeApiEndpoint } from '@/features/alert/notice-api-endpoints';
import { noticeTemplateCreateActionUrl, noticeTemplateResourceName } from '@/features/alert/notice-template-resource';
import { adaptRefineRecord, adaptRefineRecords } from '@/shared/refine/refine-provider-data';

import { isRefineHttpError, type RefineHttpError } from '../refine-http-error';
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
      const id = readNoticeTemplateId(params.id);
      const draft = readNoticeTemplateDraft(params.variables, id);
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
      const id = readNoticeTemplateId(params.id);
      const { record } = readNoticeTemplateDeleteVariables(params.variables, id);
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
      const draft = readNoticeTemplateDraft(params.payload);
      if (draft.id !== undefined) throw rejectedFailure('NOTICE_TEMPLATE_VARIABLES_INVALID');
      await saveNoticeTemplate(draft);
      return { data: adaptRefineRecord<TData>({ acknowledged: true }) };
    });
  },

  getApiUrl: () => noticeApiEndpoint
};

async function protect<T>(phase: NoticeTemplateRequestPhase, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw providerFailure(reason, phase);
  }
}

function providerFailure(reason: unknown, phase: NoticeTemplateRequestPhase): NoticeTemplateRequestFailure {
  if (reason instanceof NoticeTemplateRequestFailure) return reason;
  if (reason instanceof NoticeTemplateContractError) return contractFailure('NOTICE_TEMPLATE_RESPONSE_INVALID');
  if (isRefineHttpError(reason)) return adaptRefineFailure(reason);
  return normalizeNoticeTemplateApiFailure(reason, phase);
}

function adaptRefineFailure(reason: RefineHttpError) {
  const kind = refineFailureKind(reason);
  const outcome = refineWriteOutcome(reason);
  const code = stableTemplateCode(reason.code);
  return code === undefined
    ? new NoticeTemplateRequestFailure(kind, outcome)
    : new NoticeTemplateRequestFailure(kind, outcome, { code });
}

function refineFailureKind(reason: RefineHttpError): NoticeTemplateFailureKind {
  if (reason.statusCode === 404 || reason.code === 'NOTICE_TEMPLATE_NOT_FOUND') return 'missing';
  if (typeof reason.code === 'string' && reason.code.startsWith('NOTICE_TEMPLATE_')) return 'invalid';
  if (reason.statusCode === 0 || reason.kind === 'network' || reason.statusCode >= 500) return 'unavailable';
  return 'error';
}

function refineWriteOutcome(reason: RefineHttpError): NoticeTemplateWriteOutcome {
  return reason.statusCode >= 400 && reason.statusCode < 500 ? 'rejected' : 'uncertain';
}

function stableTemplateCode(code: string | number | undefined) {
  return typeof code === 'string' && code.startsWith('NOTICE_TEMPLATE_') ? code : undefined;
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
