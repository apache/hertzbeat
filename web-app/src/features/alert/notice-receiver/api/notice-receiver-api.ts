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
  apiMessagePut
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
  type NoticeReceiverOptionKey,
  type NoticeReceiverOptions,
  type NoticeReceiverQuery,
  type NoticeReceiverSecretKey,
  type NoticeReceiverType
} from '../model/notice-receiver-model';
import {
  NoticeReceiverContractError,
  parseNoticeReceiverMutationWire,
  parseNoticeReceiverOptionsWire,
  parseNoticeReceiverPageWire,
  parseNoticeReceiverWire,
  type NoticeReceiverWire
} from './notice-receiver-schema';

export { NoticeReceiverContractError } from './notice-receiver-schema';

export type NoticeReceiverFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';

export function classifyNoticeReceiverError(error: unknown): NoticeReceiverFailureKind {
  if (error instanceof NoticeReceiverContractError) return 'invalid';
  if (!(error instanceof ApiMessageError)) return 'error';
  if (error.message === 'Receiver missing') return 'missing';
  if (error.message === 'Receiver storage unavailable' || error.status == null || error.status >= 500) return 'unavailable';
  return 'error';
}

export async function loadNoticeReceivers(query: NoticeReceiverQuery) {
  const page = parseNoticeReceiverPageWire(await apiMessageGet<unknown>(buildNoticeReceiverListPath(query)));
  return { ...page, content: page.content.map(mapNoticeReceiver) };
}

export async function loadNoticeReceiver(id: number) {
  return mapNoticeReceiver(parseNoticeReceiverWire(await apiMessageGet<unknown>(`/api/notice/receiver/${id}`)));
}

export async function loadAllNoticeReceiverOptions() {
  return parseNoticeReceiverOptionsWire(await apiMessageGet<unknown>('/api/notice/receivers/all'));
}

export async function saveNoticeReceiver(draft: NoticeReceiverDraft) {
  const payload = buildNoticeReceiverPayload(draft);
  const value = draft.id == null
    ? await apiMessagePost<unknown>('/api/notice/receiver', payload)
    : await apiMessagePut<unknown>('/api/notice/receiver', payload);
  return mapNoticeReceiverMutation(parseNoticeReceiverMutationWire(value));
}

export async function testNoticeReceiver(draft: NoticeReceiverDraft) {
  await apiMessagePost<unknown>('/api/notice/receiver/send-test-msg', buildNoticeReceiverPayload(draft));
}

export async function deleteNoticeReceiver(id: number) {
  return mapNoticeReceiverMutation(parseNoticeReceiverMutationWire(
    await apiMessageDelete<unknown>(`/api/notice/receiver/${id}`)
  ));
}

function mapNoticeReceiver(source: NoticeReceiverWire): NoticeReceiver {
  const type = source.type;
  if (source.typeKey !== noticeReceiverTypeKeys[type]) throw new NoticeReceiverContractError();

  return {
    id: source.id,
    name: source.name,
    type,
    typeKey: source.typeKey,
    options: mapNoticeReceiverOptions(source.options, type),
    configuredSecrets: mapConfiguredSecrets(source.configuredSecrets, type),
    creator: source.creator,
    modifier: source.modifier,
    gmtCreate: source.gmtCreate,
    gmtUpdate: source.gmtUpdate
  };
}

function mapNoticeReceiverOptions(options: Record<string, unknown>, type: NoticeReceiverType): NoticeReceiverOptions {
  const allowedKeys = new Set(activeNoticeReceiverDefinition(type).fields
    .filter(field => !field.secret)
    .map(field => field.key));
  const entries = Object.entries(options).map(([key, value]) => {
    if (!allowedKeys.has(key as NoticeReceiverOptionKey)) throw new NoticeReceiverContractError();
    return [key, mapNoticeReceiverOptionValue(key as NoticeReceiverOptionKey, value)] as const;
  });
  return Object.fromEntries(entries);
}

function mapNoticeReceiverOptionValue(key: NoticeReceiverOptionKey, value: unknown): string | number {
  if (key === 'agentId') {
    if (!Number.isSafeInteger(value) || Number(value) < 0) throw new NoticeReceiverContractError();
    return Number(value);
  }
  if (key === 'larkReceiveType') {
    if (![0, 1, 2, 3].includes(value as number)) throw new NoticeReceiverContractError();
    return value as number;
  }
  if (key === 'hookAuthType') {
    if (!['None', 'Basic', 'Bearer'].includes(value as string)) throw new NoticeReceiverContractError();
    return value as string;
  }
  if (typeof value !== 'string') throw new NoticeReceiverContractError();
  return value;
}

function mapConfiguredSecrets(secrets: string[], type: NoticeReceiverType): NoticeReceiverSecretKey[] {
  const allowedSecrets = noticeReceiverSecretKeys(type);
  return secrets.map(secret => {
    if (!allowedSecrets.includes(secret as NoticeReceiverSecretKey)) throw new NoticeReceiverContractError();
    return secret as NoticeReceiverSecretKey;
  });
}

function mapNoticeReceiverMutation(
  source: ReturnType<typeof parseNoticeReceiverMutationWire>
): NoticeReceiverMutation {
  const receiver = source.receiver == null ? null : mapNoticeReceiver(source.receiver);
  if ((source.status === 'created' || source.status === 'updated') && (receiver == null || receiver.id !== source.id)) {
    throw new NoticeReceiverContractError();
  }
  if ((source.status === 'deleted' || source.status === 'missing') && receiver != null) {
    throw new NoticeReceiverContractError();
  }
  return { id: source.id, status: source.status, receiver };
}
