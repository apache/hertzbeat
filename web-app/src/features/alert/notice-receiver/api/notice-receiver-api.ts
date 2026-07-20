/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';

import {
  activeNoticeReceiverDefinition,
  buildNoticeReceiverPayload,
  noticeReceiverLarkReceiveTypes,
  noticeReceiverSecretKeys,
  noticeReceiverTypeKeys,
  noticeReceiverWebhookAuthTypes,
  writeNoticeReceiverQuery,
  type NoticeReceiver,
  type NoticeReceiverDraft,
  type NoticeReceiverMutation,
  type NoticeReceiverOptionKey,
  type NoticeReceiverOptions,
  type NoticeReceiverQuery,
  type NoticeReceiverSecretKey,
  type NoticeReceiverType
} from '../model/notice-receiver-model';
import { noticeReceiverEndpoint, noticeReceiversEndpoint } from '../../notice-api-endpoints';
import {
  NoticeReceiverContractError,
  parseNoticeReceiverMutationWire,
  parseNoticeReceiverOptionsWire,
  parseNoticeReceiverPageWire,
  parseNoticeReceiverWire,
  type NoticeReceiverWire
} from './notice-receiver-schema';
import { requireExactNoticeReceiver } from '../notice-receiver-evidence';

export { NoticeReceiverContractError } from './notice-receiver-schema';

export async function loadNoticeReceivers(query: NoticeReceiverQuery) {
  const page = parseNoticeReceiverPageWire(
    await apiMessageGet(`${noticeReceiversEndpoint}?${writeNoticeReceiverQuery(query).toString()}`)
  );
  return { ...page, content: page.content.map(mapNoticeReceiver) };
}

export async function loadNoticeReceiver(id: number) {
  return requireExactNoticeReceiver(
    mapNoticeReceiver(parseNoticeReceiverWire(await apiMessageGet(noticeReceiverDetailEndpoint(id)))),
    id
  );
}

export async function loadAllNoticeReceiverOptions() {
  return parseNoticeReceiverOptionsWire(await apiMessageGet(`${noticeReceiversEndpoint}/all`));
}

export async function saveNoticeReceiver(draft: NoticeReceiverDraft) {
  const payload = buildNoticeReceiverPayload(draft);
  const value =
    draft.id == null
      ? await apiMessagePost(noticeReceiverEndpoint, payload)
      : await apiMessagePut(noticeReceiverEndpoint, payload);
  return mapNoticeReceiverMutation(parseNoticeReceiverMutationWire(value));
}

export async function testNoticeReceiver(draft: NoticeReceiverDraft) {
  await apiMessagePost(`${noticeReceiverEndpoint}/send-test-msg`, buildNoticeReceiverPayload(draft));
}

export async function deleteNoticeReceiver(id: number) {
  return mapNoticeReceiverMutation(
    parseNoticeReceiverMutationWire(await apiMessageDelete(noticeReceiverDetailEndpoint(id)))
  );
}

function noticeReceiverDetailEndpoint(id: number) {
  return `${noticeReceiverEndpoint}/${id}`;
}

function mapNoticeReceiver(source: NoticeReceiverWire): NoticeReceiver {
  const type = source.type;
  // A valid numeric type paired with another type's key is crossed evidence,
  // not a usable receiver. Keep both identifiers tied to the same catalog row.
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
  // Only non-secret fields may return in options. Secrets are represented by
  // configuredSecrets metadata and must never enter ordinary frontend state.
  const allowedKeys = new Set(
    activeNoticeReceiverDefinition(type)
      .fields.filter(field => !field.secret)
      .map(field => field.key)
  );
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
    if (!noticeReceiverLarkReceiveTypes.includes(value as (typeof noticeReceiverLarkReceiveTypes)[number])) {
      throw new NoticeReceiverContractError();
    }
    return value as number;
  }
  if (key === 'hookAuthType') {
    if (!noticeReceiverWebhookAuthTypes.includes(value as (typeof noticeReceiverWebhookAuthTypes)[number])) {
      throw new NoticeReceiverContractError();
    }
    return value as string;
  }
  if (typeof value !== 'string') throw new NoticeReceiverContractError();
  return value;
}

function mapConfiguredSecrets(secrets: string[], type: NoticeReceiverType): NoticeReceiverSecretKey[] {
  // Treat configuredSecrets as capability metadata, not arbitrary field names.
  // A crossed secret name often indicates a backend serialization regression.
  const allowedSecrets = noticeReceiverSecretKeys(type);
  if (new Set(secrets).size !== secrets.length) throw new NoticeReceiverContractError();
  return secrets.map(secret => {
    if (!allowedSecrets.includes(secret as NoticeReceiverSecretKey)) throw new NoticeReceiverContractError();
    return secret as NoticeReceiverSecretKey;
  });
}

function mapNoticeReceiverMutation(source: ReturnType<typeof parseNoticeReceiverMutationWire>): NoticeReceiverMutation {
  const receiver = source.receiver == null ? null : mapNoticeReceiver(source.receiver);
  // Successful writes require matching authoritative evidence. Delete and
  // missing acknowledgements must not smuggle a stale receiver back into state.
  if ((source.status === 'created' || source.status === 'updated') && (receiver == null || receiver.id !== source.id)) {
    throw new NoticeReceiverContractError();
  }
  if ((source.status === 'deleted' || source.status === 'missing') && receiver != null) {
    throw new NoticeReceiverContractError();
  }
  return { id: source.id, status: source.status, receiver };
}
