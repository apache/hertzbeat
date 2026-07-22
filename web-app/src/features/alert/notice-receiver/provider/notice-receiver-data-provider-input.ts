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

import { createRefineHttpError } from '@/shared/refine/refine-http-error';
import { hasOwnProperties } from '@/shared/validation/own-properties';

import {
  createNoticeReceiverDraft,
  noticeReceiverLarkReceiveTypes,
  noticeReceiverPageSizes,
  noticeReceiverSecretKeyCatalog,
  noticeReceiverWebhookAuthTypes,
  receiverTypeDefinitions,
  validateNoticeReceiverDraft,
  type NoticeReceiverDraft,
  type NoticeReceiverQuery
} from '../model/notice-receiver-model';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);
const pageSizeSchema = z.union(noticeReceiverPageSizes.map(size => z.literal(size)));
const looseNumberSchema = z.custom<number>(value => typeof value === 'number');
const receiverTypeSchema = z.custom<NoticeReceiverDraft['type']>(value =>
  receiverTypeDefinitions.some(item => item.type === value)
);
const webhookAuthTypeSchema = z.enum(noticeReceiverWebhookAuthTypes);
const larkReceiveTypeSchema = z.union(noticeReceiverLarkReceiveTypes.map(type => z.literal(type)));
const secretKeyArraySchema = z.array(z.enum(noticeReceiverSecretKeyCatalog));
const draftShape = {
  id: positiveIntegerSchema.optional(),
  name: z.string(),
  type: receiverTypeSchema,
  phone: z.string(),
  email: z.string(),
  hookUrl: z.string(),
  hookAuthType: webhookAuthTypeSchema,
  hookAuthToken: z.string(),
  wechatId: z.string(),
  accessToken: z.string(),
  tgBotToken: z.string(),
  tgUserId: z.string(),
  tgMessageThreadId: z.string(),
  slackWebHookUrl: z.string(),
  discordChannelId: z.string(),
  discordBotToken: z.string(),
  corpId: z.string(),
  agentId: z.union([z.null(), looseNumberSchema]),
  appSecret: z.string(),
  userId: z.string(),
  partyId: z.string(),
  tagId: z.string(),
  smnAk: z.string(),
  smnSk: z.string(),
  smnProjectId: z.string(),
  smnRegion: z.string(),
  smnTopicUrn: z.string(),
  serverChanToken: z.string(),
  gotifyToken: z.string(),
  appId: z.string(),
  larkReceiveType: larkReceiveTypeSchema,
  chatId: z.string(),
  configuredSecrets: secretKeyArraySchema,
  clearSecrets: secretKeyArraySchema
};
const draftSchema = z.object(draftShape);
const draftFieldNames = Object.keys(draftShape).filter(key => key !== 'id');
const nameFilterSchema = z.object({
  field: z.literal('name'),
  operator: z.literal('contains'),
  value: z.string()
});
const deleteRecordSchema = z.object({ id: positiveIntegerSchema });

export function readNoticeReceiverListQuery(params: GetListParams): NoticeReceiverQuery {
  if (params.sorters?.length) throw inputError('NOTICE_RECEIVER_SORT_UNSUPPORTED');
  if (params.pagination?.mode && params.pagination.mode !== 'server') {
    throw inputError('NOTICE_RECEIVER_PAGINATION_UNSUPPORTED');
  }
  const currentPage = parse(
    positiveIntegerSchema,
    params.pagination?.currentPage ?? 1,
    'NOTICE_RECEIVER_PAGINATION_INVALID'
  );
  const pageSize = parse(pageSizeSchema, params.pagination?.pageSize ?? 8, 'NOTICE_RECEIVER_PAGINATION_INVALID');
  const name = readNameFilter(params.filters);
  return { name, pageIndex: currentPage - 1, pageSize };
}

export function readNoticeReceiverId(value: string | number): number {
  return parse(positiveIntegerSchema, value, 'NOTICE_RECEIVER_ID_INVALID');
}

export function readNoticeReceiverDraft(value: unknown, id?: number): NoticeReceiverDraft {
  if (!hasCurrentDraftShape() || !hasOwnProperties(value, draftFieldNames)) {
    throw inputError('NOTICE_RECEIVER_VARIABLES_INVALID');
  }
  const source = parse(draftSchema, value, 'NOTICE_RECEIVER_VARIABLES_INVALID');
  if (source.id !== undefined && !Object.hasOwn(value, 'id')) {
    throw inputError('NOTICE_RECEIVER_VARIABLES_INVALID');
  }
  if (id === undefined ? source.id !== undefined : source.id !== id) {
    throw inputError('NOTICE_RECEIVER_VARIABLES_INVALID');
  }
  // Zod models an optional key as possibly present with `undefined`; the
  // domain model instead requires true absence for a create draft.
  const { id: sourceId, ...fields } = source;
  const draft: NoticeReceiverDraft = sourceId === undefined ? fields : { ...fields, id: sourceId };
  if (validateNoticeReceiverDraft(draft).length > 0) {
    throw inputError('NOTICE_RECEIVER_VARIABLES_INVALID');
  }
  return draft;
}

export function readNoticeReceiverDeleteRecord(value: unknown, id: number) {
  if (!hasOwnProperties(value, ['id'])) throw inputError('NOTICE_RECEIVER_VARIABLES_INVALID');
  const source = parse(deleteRecordSchema, value, 'NOTICE_RECEIVER_VARIABLES_INVALID');
  if (source.id !== id) throw inputError('NOTICE_RECEIVER_VARIABLES_INVALID');
  return { id: source.id };
}

function hasCurrentDraftShape() {
  const baselineKeys = Object.keys(createNoticeReceiverDraft());
  return baselineKeys.length === draftFieldNames.length && baselineKeys.every(key => draftFieldNames.includes(key));
}

function readNameFilter(filters: GetListParams['filters']) {
  if (!filters?.length) return '';
  if (filters.length !== 1) throw inputError('NOTICE_RECEIVER_FILTER_UNSUPPORTED');
  return parse(nameFilterSchema, filters[0], 'NOTICE_RECEIVER_FILTER_UNSUPPORTED').value.trim();
}

function parse<T extends z.ZodType>(schema: T, value: unknown, code: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw inputError(code);
}

function inputError(code: string) {
  return createRefineHttpError('Notice receiver input is invalid', 400, code);
}
