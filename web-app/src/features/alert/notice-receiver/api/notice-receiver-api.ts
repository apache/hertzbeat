/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';

import {
  buildNoticeReceiverPayload,
  noticeReceiverTypeKeys,
  writeNoticeReceiverQuery,
  type NoticeReceiver,
  type NoticeReceiverDraft,
  type NoticeReceiverMutation,
  type NoticeReceiverQuery
} from '../model/notice-receiver-model';
import { noticeReceiverEndpoint, noticeReceiversEndpoint } from '../../api/notice-api-endpoints';
import {
  NoticeReceiverContractError,
  parseNoticeReceiverMutationWire,
  parseNoticeReceiverOptionsWire,
  parseNoticeReceiverPageWire,
  parseNoticeReceiverWire,
  type NoticeReceiverWire
} from './notice-receiver-schema';
import { noticeReceiverApiRequest } from './notice-receiver-api-failure';
import { requireExactNoticeReceiver } from '../model/notice-receiver-evidence';

export { NoticeReceiverContractError } from './notice-receiver-schema';

export async function loadNoticeReceivers(query: NoticeReceiverQuery) {
  return noticeReceiverApiRequest('collection', async () => {
    const page = parseNoticeReceiverPageWire(
      await apiMessageGet(`${noticeReceiversEndpoint}?${writeNoticeReceiverQuery(query).toString()}`),
      query
    );
    return { ...page, content: page.content.map(mapNoticeReceiver) };
  });
}

export async function loadNoticeReceiver(id: number) {
  return noticeReceiverApiRequest('detail', async () =>
    requireExactNoticeReceiver(
      mapNoticeReceiver(parseNoticeReceiverWire(await apiMessageGet(noticeReceiverDetailEndpoint(id)))),
      id
    )
  );
}

export async function loadAllNoticeReceiverOptions(signal?: AbortSignal) {
  return noticeReceiverApiRequest('collection', async () =>
    parseNoticeReceiverOptionsWire(
      await (signal
        ? apiMessageGet(`${noticeReceiversEndpoint}/all`, { signal })
        : apiMessageGet(`${noticeReceiversEndpoint}/all`))
    )
  );
}

export async function saveNoticeReceiver(draft: NoticeReceiverDraft) {
  const payload = buildNoticeReceiverPayload(draft);
  return noticeReceiverApiRequest('write', async () => {
    const value =
      draft.id == null
        ? await apiMessagePost(noticeReceiverEndpoint, payload)
        : await apiMessagePut(noticeReceiverEndpoint, payload);
    return mapNoticeReceiverMutation(parseNoticeReceiverMutationWire(value));
  });
}

export async function testNoticeReceiver(draft: NoticeReceiverDraft) {
  const payload = buildNoticeReceiverPayload(draft);
  await noticeReceiverApiRequest('command', () => apiMessagePost(`${noticeReceiverEndpoint}/send-test-msg`, payload));
}

export async function deleteNoticeReceiver(id: number) {
  return noticeReceiverApiRequest('write', async () =>
    mapNoticeReceiverMutation(parseNoticeReceiverMutationWire(await apiMessageDelete(noticeReceiverDetailEndpoint(id))))
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
    options: source.options,
    configuredSecrets: source.configuredSecrets,
    creator: source.creator,
    modifier: source.modifier,
    gmtCreate: source.gmtCreate,
    gmtUpdate: source.gmtUpdate
  };
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
