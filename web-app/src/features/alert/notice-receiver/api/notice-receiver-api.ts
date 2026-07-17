/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  ApiMessageError,
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut,
  type PageResult
} from '@/core/http/api-message';

import {
  activeNoticeReceiverDefinition,
  buildNoticeReceiverListPath,
  buildNoticeReceiverPayload,
  noticeReceiverSecretKeys,
  noticeReceiverTypeKeys,
  type NoticeReceiver,
  type NoticeReceiverDraft,
  type NoticeReceiverMutation,
  type NoticeReceiverOption,
  type NoticeReceiverOptions,
  type NoticeReceiverQuery,
  type NoticeReceiverType
} from '../model/notice-receiver-model';

export class NoticeReceiverContractError extends Error {
  readonly code = 'NOTICE_RECEIVER_RESPONSE_INVALID';

  constructor() {
    super('Invalid notice receiver response');
    this.name = 'NoticeReceiverContractError';
  }
}

export type NoticeReceiverFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';

export function classifyNoticeReceiverError(error: unknown): NoticeReceiverFailureKind {
  if (error instanceof NoticeReceiverContractError) return 'invalid';
  if (!(error instanceof ApiMessageError)) return 'error';
  if (error.message === 'Receiver missing') return 'missing';
  if (error.message === 'Receiver storage unavailable' || error.status == null || error.status >= 500) return 'unavailable';
  return 'error';
}

export async function loadNoticeReceivers(query: NoticeReceiverQuery) {
  return parsePage(await apiMessageGet<unknown>(buildNoticeReceiverListPath(query)));
}

export async function loadNoticeReceiver(id: number) {
  return parseReceiver(await apiMessageGet<unknown>(`/api/notice/receiver/${id}`));
}

export async function loadAllNoticeReceiverOptions() {
  const value = await apiMessageGet<unknown>('/api/notice/receivers/all');
  if (!Array.isArray(value)) throw new NoticeReceiverContractError();
  return value.map(parseOption);
}

export async function saveNoticeReceiver(draft: NoticeReceiverDraft) {
  const payload = buildNoticeReceiverPayload(draft);
  const value = draft.id == null
    ? await apiMessagePost<unknown>('/api/notice/receiver', payload)
    : await apiMessagePut<unknown>('/api/notice/receiver', payload);
  return parseMutation(value);
}

export async function testNoticeReceiver(draft: NoticeReceiverDraft) {
  await apiMessagePost<unknown>('/api/notice/receiver/send-test-msg', buildNoticeReceiverPayload(draft));
}

export async function deleteNoticeReceiver(id: number) {
  return parseMutation(await apiMessageDelete<unknown>(`/api/notice/receiver/${id}`));
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new NoticeReceiverContractError();
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new NoticeReceiverContractError();
}

function integer(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new NoticeReceiverContractError();
  return Number(value);
}

function receiverType(value: unknown): NoticeReceiverType {
  const type = integer(value);
  if (!(type in noticeReceiverTypeKeys)) throw new NoticeReceiverContractError();
  return type as NoticeReceiverType;
}

function text(value: unknown, nullable = false) {
  if (nullable && value == null) return null;
  if (typeof value !== 'string') throw new NoticeReceiverContractError();
  return value;
}

function parseOptions(value: unknown, type: NoticeReceiverType): NoticeReceiverOptions {
  const source = record(value);
  const fields = activeNoticeReceiverDefinition(type).fields.filter(item => !item.secret).map(item => item.key);
  exactKeys(source, fields);
  const result: NoticeReceiverOptions = {};
  for (const [key, option] of Object.entries(source)) {
    if (key === 'agentId') result.agentId = integer(option);
    else if (key === 'larkReceiveType') {
      const receiveType = integer(option);
      if (receiveType > 3) throw new NoticeReceiverContractError();
      result.larkReceiveType = receiveType as 0 | 1 | 2 | 3;
    } else if (key === 'hookAuthType') {
      if (!['None', 'Basic', 'Bearer'].includes(String(option))) throw new NoticeReceiverContractError();
      result.hookAuthType = String(option) as 'None' | 'Basic' | 'Bearer';
    } else result[key as keyof NoticeReceiverOptions] = text(option) as never;
  }
  return result;
}

function parseReceiver(value: unknown): NoticeReceiver {
  const source = record(value);
  exactKeys(source, ['id', 'name', 'type', 'typeKey', 'options', 'configuredSecrets', 'creator', 'modifier', 'gmtCreate', 'gmtUpdate']);
  const type = receiverType(source.type);
  if (source.typeKey !== noticeReceiverTypeKeys[type]) throw new NoticeReceiverContractError();
  if (!Array.isArray(source.configuredSecrets)) throw new NoticeReceiverContractError();
  const allowedSecrets = noticeReceiverSecretKeys(type);
  const configuredSecrets = source.configuredSecrets.map(item => {
    if (typeof item !== 'string' || !allowedSecrets.includes(item as never)) throw new NoticeReceiverContractError();
    return item as (typeof allowedSecrets)[number];
  });
  return {
    id: integer(source.id),
    name: text(source.name)!,
    type,
    typeKey: text(source.typeKey)!,
    options: parseOptions(source.options, type),
    configuredSecrets,
    creator: text(source.creator, true),
    modifier: text(source.modifier, true),
    gmtCreate: text(source.gmtCreate, true),
    gmtUpdate: text(source.gmtUpdate, true)
  };
}

function parsePage(value: unknown): PageResult<NoticeReceiver> {
  const source = record(value);
  if (!Array.isArray(source.content)) throw new NoticeReceiverContractError();
  return {
    content: source.content.map(parseReceiver),
    totalElements: integer(source.totalElements),
    totalPages: integer(source.totalPages),
    number: integer(source.number),
    size: integer(source.size)
  };
}

function parseOption(value: unknown): NoticeReceiverOption {
  const source = record(value);
  exactKeys(source, ['id', 'name', 'type']);
  return { id: integer(source.id), name: text(source.name)!, type: receiverType(source.type) };
}

function parseMutation(value: unknown): NoticeReceiverMutation {
  const source = record(value);
  exactKeys(source, ['id', 'status', 'receiver']);
  const id = integer(source.id);
  if (!['created', 'updated', 'deleted', 'missing'].includes(String(source.status))) throw new NoticeReceiverContractError();
  const status = source.status as NoticeReceiverMutation['status'];
  const receiver = source.receiver == null ? null : parseReceiver(source.receiver);
  if ((status === 'created' || status === 'updated') && (receiver == null || receiver.id !== id)) {
    throw new NoticeReceiverContractError();
  }
  if ((status === 'deleted' || status === 'missing') && receiver != null) throw new NoticeReceiverContractError();
  return { id, status, receiver };
}
