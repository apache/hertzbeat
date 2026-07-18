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

import type { GetListParams } from '@refinedev/core';
import { z } from 'zod';

import {
  noticeTemplatePageSizes,
  validateNoticeTemplateDraft,
  type NoticeTemplateDraft,
  type NoticeTemplateQuery
} from '@/features/alert/notice-template-model';

import { createRefineHttpError } from '../refine-http-error';

type DeleteRecordIdentity = {
  id: string;
  backendId: number;
  preset: false;
} & Record<string, unknown>;

export type NoticeTemplateDeleteVariables = {
  record: DeleteRecordIdentity;
  query: NoticeTemplateQuery & Record<string, unknown>;
};

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0);
const pageSizeSchema = z.union(noticeTemplatePageSizes.map(size => z.literal(size)));
const nameFilterSchema = z.object({
  field: z.literal('name'),
  operator: z.literal('contains'),
  value: z.string()
});
const presetFilterSchema = z.object({
  field: z.literal('preset'),
  operator: z.literal('eq'),
  value: z.boolean()
});
const draftSchema = z.object({
  id: positiveIntegerSchema.optional(),
  name: z.string(),
  type: z.custom<NoticeTemplateDraft['type']>(value => typeof value === 'number'),
  content: z.string()
}).superRefine((draft, context) => {
  const { id, ...fields } = draft;
  const candidate: NoticeTemplateDraft = id === undefined ? fields : { ...fields, id };
  if (validateNoticeTemplateDraft(candidate).length > 0) {
    context.addIssue({ code: 'custom', message: 'Draft failed domain validation' });
  }
});
const deleteEnvelopeSchema = z.object({
  record: z.unknown().optional(),
  query: z.unknown().optional()
});
const deleteRecordIdentitySchema = z.object({
  id: z.string(),
  backendId: positiveIntegerSchema,
  preset: z.literal(false)
}).passthrough();
const deleteQuerySchema = z.object({
  name: z.string(),
  preset: z.boolean(),
  pageIndex: nonNegativeIntegerSchema,
  pageSize: pageSizeSchema
}).passthrough();

export function readNoticeTemplateListQuery(params: GetListParams): NoticeTemplateQuery {
  if (params.sorters?.length) throw inputError('NOTICE_TEMPLATE_SORT_UNSUPPORTED');
  if (params.pagination?.mode && params.pagination.mode !== 'server') {
    throw inputError('NOTICE_TEMPLATE_PAGINATION_UNSUPPORTED');
  }
  const currentPage = parse(
    positiveIntegerSchema,
    params.pagination?.currentPage ?? 1,
    'NOTICE_TEMPLATE_PAGINATION_INVALID'
  );
  const pageSize = parse(
    pageSizeSchema,
    params.pagination?.pageSize ?? 8,
    'NOTICE_TEMPLATE_PAGINATION_INVALID'
  );
  const { name, preset } = readFilters(params.filters);
  return { name, preset, pageIndex: currentPage - 1, pageSize };
}

function readFilters(filters: GetListParams['filters']): Pick<NoticeTemplateQuery, 'name' | 'preset'> {
  let name = '';
  let preset: boolean | undefined;
  for (const filter of filters ?? []) {
    const nameResult = nameFilterSchema.safeParse(filter);
    if (nameResult.success) {
      name = nameResult.data.value.trim();
      continue;
    }
    const presetResult = presetFilterSchema.safeParse(filter);
    if (presetResult.success) {
      preset = presetResult.data.value;
      continue;
    }
    throw inputError('NOTICE_TEMPLATE_FILTER_UNSUPPORTED');
  }
  if (preset === undefined) throw inputError('NOTICE_TEMPLATE_FILTER_UNSUPPORTED');
  return { name, preset };
}

export function readNoticeTemplateDraft(value: unknown, id?: number): NoticeTemplateDraft {
  const source = parse(draftSchema, value, 'NOTICE_TEMPLATE_VARIABLES_INVALID');
  const { id: sourceId, ...fields } = source;
  if (sourceId !== undefined && sourceId !== id) {
    throw inputError('NOTICE_TEMPLATE_VARIABLES_INVALID');
  }
  return id === undefined ? fields : { ...fields, id };
}

export function readNoticeTemplateDeleteVariables(value: unknown, id: number): NoticeTemplateDeleteVariables {
  const source = parse(deleteEnvelopeSchema, value, 'NOTICE_TEMPLATE_VARIABLES_INVALID');
  const record = parseDeleteIdentity(source.record, id);
  if (!source.query) throw inputError('NOTICE_TEMPLATE_DELETE_FORBIDDEN');
  const query = parse(deleteQuerySchema, source.query, 'NOTICE_TEMPLATE_VARIABLES_INVALID');
  return { record, query };
}

export function readNoticeTemplateId(value: string | number): number {
  return parse(positiveIntegerSchema, value, 'NOTICE_TEMPLATE_ID_INVALID');
}

function parseDeleteIdentity(value: unknown, id: number): DeleteRecordIdentity {
  const result = deleteRecordIdentitySchema.safeParse(value);
  if (
    !result.success
    || result.data.backendId !== id
    || result.data.id !== `notice-template:custom:${id}`
  ) {
    throw inputError('NOTICE_TEMPLATE_DELETE_FORBIDDEN');
  }
  return result.data;
}

function parse<T extends z.ZodType>(schema: T, value: unknown, code: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw inputError(code);
}

function inputError(code: string) {
  return createRefineHttpError('Notice Template input is invalid', 400, code);
}
