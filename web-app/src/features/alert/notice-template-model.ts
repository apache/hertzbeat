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

import { receiverTypeDefinitions, type NoticeReceiverType } from './notice-receiver/model/notice-receiver-model';

export const noticeTemplatePageSizes = [8, 15, 25] as const;

export type NoticeTemplateQuery = { name: string; preset: boolean; pageIndex: number; pageSize: number };
export type NoticeTemplateDraft = { id?: number; name: string; type: NoticeReceiverType; content: string };
export type NoticeTemplate = {
  id?: number | null;
  name: string;
  type: NoticeReceiverType;
  preset: boolean;
  content: string;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: string | number | null;
  gmtUpdate?: string | number | null;
};
type NoticeTemplateResourceFields = Omit<NoticeTemplate, 'id' | 'preset'>;
export type NoticeTemplateResourceRecord =
  | (NoticeTemplateResourceFields & { id: string; backendId: null; preset: true })
  | (NoticeTemplateResourceFields & { id: string; backendId: number; preset: false });
export type NoticeTemplatePage = {
  content: NoticeTemplate[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};
export type NoticeTemplateListState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; records: NoticeTemplateResourceRecord[]; total: number };

export class NoticeTemplateContractError extends Error {
  constructor() {
    super('Notice Template response is invalid');
    this.name = 'NoticeTemplateContractError';
  }
}

const supportedTypes = new Set<NoticeReceiverType>(receiverTypeDefinitions.map(definition => definition.type));

export function readNoticeTemplateQuery(params: URLSearchParams): NoticeTemplateQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    name: params.get('name')?.trim() ?? '',
    preset: params.get('preset') !== 'false',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: noticeTemplatePageSizes.includes(pageSize as typeof noticeTemplatePageSizes[number]) ? pageSize : 8
  };
}

export function writeNoticeTemplateQuery(query: NoticeTemplateQuery) {
  const params = new URLSearchParams();
  if (query.name) params.set('name', query.name);
  params.set('preset', String(query.preset));
  params.set('pageIndex', String(query.pageIndex));
  params.set('pageSize', String(query.pageSize));
  return params;
}

export function buildNoticeTemplateListPath(query: NoticeTemplateQuery) {
  return `/api/notice/templates?${writeNoticeTemplateQuery(query).toString()}`;
}

export function createNoticeTemplateDraft(): NoticeTemplateDraft {
  return { name: '', type: 1, content: '' };
}

export function noticeTemplateDraftFromDetail(template: NoticeTemplate): NoticeTemplateDraft {
  return {
    ...(template.id == null ? {} : { id: template.id }),
    name: template.name,
    type: template.type,
    content: template.content
  };
}

export function noticeTemplateDraftFromResource(template: NoticeTemplateResourceRecord): NoticeTemplateDraft {
  if (template.backendId == null) throw new NoticeTemplateContractError();
  return {
    id: template.backendId,
    name: template.name,
    type: template.type,
    content: template.content
  };
}

export function noticeTemplateResourceRecord(template: NoticeTemplate): NoticeTemplateResourceRecord {
  if (template.preset) {
    return {
      ...template,
      id: `notice-template:preset:${template.type}:${encodeURIComponent(template.name)}`,
      backendId: null,
      preset: true
    };
  }
  const backendId = readPositiveInteger(template.id);
  return {
    ...template,
    id: `notice-template:custom:${backendId}`,
    backendId,
    preset: false
  };
}

export function buildNoticeTemplatePayload(draft: NoticeTemplateDraft) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    type: draft.type,
    preset: false,
    content: draft.content.trim()
  };
}

export function isNoticeTemplateReadOnly(template: Pick<NoticeTemplate, 'preset'>) {
  return template.preset;
}

export function validateNoticeTemplateDraft(draft: NoticeTemplateDraft) {
  const invalid: Array<'name' | 'type' | 'content'> = [];
  const name = draft.name.trim();
  const content = draft.content.trim();
  if (!name || name.length > 100) invalid.push('name');
  if (!supportedTypes.has(draft.type)) invalid.push('type');
  if (!content || content.length > 60_000) invalid.push('content');
  return invalid;
}

export function parseNoticeTemplatePage(value: unknown): NoticeTemplatePage {
  if (!isPlainRecord(value) || !Array.isArray(value.content)) throw new NoticeTemplateContractError();
  const content = value.content.map(parseNoticeTemplateDetail);
  const totalElements = readNonnegativeInteger(value.totalElements);
  const totalPages = readNonnegativeInteger(value.totalPages);
  const number = readNonnegativeInteger(value.number);
  const size = readPositiveInteger(value.size);
  if (content.length > size) throw new NoticeTemplateContractError();
  return {
    content,
    totalElements,
    totalPages,
    number,
    size
  };
}

export function parseNoticeTemplateDetail(value: unknown): NoticeTemplate {
  if (!isPlainRecord(value)) throw new NoticeTemplateContractError();
  const id = readOptionalId(value.id);
  if (
    typeof value.name !== 'string'
    || !value.name.trim()
    || !supportedTypes.has(value.type as NoticeReceiverType)
    || typeof value.preset !== 'boolean'
    || typeof value.content !== 'string'
    || !value.content.trim()
  ) {
    throw new NoticeTemplateContractError();
  }
  if (!value.preset && id == null) throw new NoticeTemplateContractError();
  return {
    ...(id === undefined ? {} : { id }),
    name: value.name,
    type: value.type as NoticeReceiverType,
    preset: value.preset,
    content: value.content,
    ...readOptionalStringField(value, 'creator'),
    ...readOptionalStringField(value, 'modifier'),
    ...readOptionalTimeField(value, 'gmtCreate'),
    ...readOptionalTimeField(value, 'gmtUpdate')
  };
}

function readNonnegativeInteger(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new NoticeTemplateContractError();
  return value as number;
}

function readPositiveInteger(value: unknown) {
  const integer = readNonnegativeInteger(value);
  if (integer < 1) throw new NoticeTemplateContractError();
  return integer;
}

function readOptionalId(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return readPositiveInteger(value);
}

function readOptionalStringField(value: Record<string, unknown>, key: 'creator' | 'modifier') {
  const field = value[key];
  if (field === undefined) return {};
  if (field !== null && typeof field !== 'string') throw new NoticeTemplateContractError();
  return { [key]: field };
}

function readOptionalTimeField(value: Record<string, unknown>, key: 'gmtCreate' | 'gmtUpdate') {
  const field = value[key];
  if (field === undefined) return {};
  if (field !== null && typeof field !== 'string' && !(typeof field === 'number' && Number.isFinite(field))) {
    throw new NoticeTemplateContractError();
  }
  return { [key]: field };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}
