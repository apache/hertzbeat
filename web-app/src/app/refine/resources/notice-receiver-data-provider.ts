/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type {
  BaseRecord,
  CreateResponse,
  DataProvider,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneResponse,
  UpdateResponse
} from '@refinedev/core';

import {
  deleteNoticeReceiver,
  loadNoticeReceiver,
  loadNoticeReceivers,
  saveNoticeReceiver
} from '@/features/alert/notice-receiver/api/notice-receiver-api';
import {
  NoticeReceiverRequestFailure,
  withNoticeReceiverMutation
} from '@/features/alert/notice-receiver/model/notice-receiver-failure';
import { noticeReceiverResourceName } from '@/features/alert/notice-receiver/notice-receiver-resource';
import type {
  NoticeReceiverDraft,
  NoticeReceiverMutation
} from '@/features/alert/notice-receiver/model/notice-receiver-model';
import { requireNoticeReceiverConverged } from '@/features/alert/notice-receiver/model/notice-receiver-evidence';
import { noticeApiEndpoint } from '@/features/alert/notice-api-endpoints';
import { adaptRefineRecord, adaptRefineRecords } from '@/shared/refine/refine-provider-data';

import {
  normalizeNoticeReceiverProviderFailure,
  readNoticeReceiverWriteInput
} from './notice-receiver-data-provider-failure';
import {
  readNoticeReceiverDeleteRecord,
  readNoticeReceiverDraft,
  readNoticeReceiverId,
  readNoticeReceiverListQuery
} from './notice-receiver-data-provider-input';

export const noticeReceiverDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect('collection', async () => {
      assertResource(params.resource);
      const page = await loadNoticeReceivers(readNoticeReceiverListQuery(params));
      return { data: adaptRefineRecords<TData>(page.content), total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect('detail', async () => {
      assertResource(params.resource);
      const id = readNoticeReceiverId(params.id);
      const receiver = await loadNoticeReceiver(id);
      if (receiver.id !== id) throw contractFailure('NOTICE_RECEIVER_REREAD_INVALID');
      return { data: adaptRefineRecord<TData>(receiver) };
    });
  },

  create<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    variables: TVariables;
  }): Promise<CreateResponse<TData>> {
    return protect('write', async () => {
      assertResource(params.resource);
      const draft = readNoticeReceiverWriteInput(() => readNoticeReceiverDraft(params.variables));
      const mutation = await saveNoticeReceiver(draft);
      assertMutation(mutation, 'created');
      const canonical = await requireCanonicalAfterMutation(mutation, draft);
      return { data: adaptRefineRecord<TData>(canonical) };
    });
  },

  update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protect('write', async () => {
      assertResource(params.resource);
      const { id, draft } = readNoticeReceiverWriteInput(() => {
        const id = readNoticeReceiverId(params.id);
        return { id, draft: readNoticeReceiverDraft(params.variables, id) };
      });
      const mutation = await saveNoticeReceiver(draft);
      assertMutation(mutation, 'updated', id);
      const canonical = await requireCanonicalAfterMutation(mutation, draft);
      return { data: adaptRefineRecord<TData>(canonical) };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return protect('write', async () => {
      assertResource(params.resource);
      const { id, canonical } = readNoticeReceiverWriteInput(() => {
        const id = readNoticeReceiverId(params.id);
        return { id, canonical: readNoticeReceiverDeleteRecord(params.variables, id) };
      });
      const mutation = await deleteNoticeReceiver(id);
      if (mutation.status === 'missing') throw rejectedFailure('missing', 'NOTICE_RECEIVER_MISSING');
      if (mutation.status !== 'deleted' || mutation.id !== id || mutation.receiver !== null) {
        throw contractFailure('NOTICE_RECEIVER_DELETE_NOT_CONFIRMED');
      }
      return { data: adaptRefineRecord<TData>(canonical) };
    });
  },

  getApiUrl: () => noticeApiEndpoint
};

async function protect<T>(phase: 'detail' | 'collection' | 'write', operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw normalizeNoticeReceiverProviderFailure(reason, phase);
  }
}

function assertResource(resource: string) {
  if (resource !== noticeReceiverResourceName) {
    throw rejectedFailure('invalid', 'NOTICE_RECEIVER_RESOURCE_UNSUPPORTED');
  }
}

async function requireCanonical(id: number, draft: NoticeReceiverDraft) {
  const canonical = await loadNoticeReceiver(id);
  try {
    return requireNoticeReceiverConverged(canonical, id, draft);
  } catch {
    throw contractFailure('NOTICE_RECEIVER_REREAD_INVALID');
  }
}

async function requireCanonicalAfterMutation(mutation: NoticeReceiverMutation, draft: NoticeReceiverDraft) {
  try {
    return await requireCanonical(mutation.id, draft);
  } catch (reason) {
    throw withNoticeReceiverMutation(normalizeNoticeReceiverProviderFailure(reason, 'detail'), mutation);
  }
}

function assertMutation(
  mutation: Awaited<ReturnType<typeof saveNoticeReceiver>>,
  expected: 'created' | 'updated',
  id?: number
) {
  if (mutation.status === 'missing') throw rejectedFailure('missing', 'NOTICE_RECEIVER_MISSING');
  if (
    mutation.status !== expected ||
    mutation.receiver === null ||
    mutation.receiver.id !== mutation.id ||
    (id !== undefined && mutation.id !== id)
  ) {
    throw contractFailure('NOTICE_RECEIVER_MUTATION_INVALID');
  }
}

function contractFailure(code: string) {
  return new NoticeReceiverRequestFailure('invalid', 'uncertain', { code });
}

function rejectedFailure(kind: 'missing' | 'invalid', code: string) {
  return new NoticeReceiverRequestFailure(kind, 'rejected', { code });
}
