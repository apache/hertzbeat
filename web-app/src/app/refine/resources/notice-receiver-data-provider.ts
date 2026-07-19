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
  NoticeReceiverContractError,
  saveNoticeReceiver
} from '@/features/alert/notice-receiver/api/notice-receiver-api';
import { noticeReceiverResourceName } from '@/features/alert/notice-receiver/notice-receiver-resource';
import type {
  NoticeReceiverDraft,
  NoticeReceiverMutation
} from '@/features/alert/notice-receiver/model/notice-receiver-model';
import {
  attachNoticeReceiverMutation,
  requireNoticeReceiverConverged
} from '@/features/alert/notice-receiver/notice-receiver-evidence';
import { adaptRefineRecord, adaptRefineRecords } from '@/shared/refine/refine-provider-data';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';
import {
  readNoticeReceiverDeleteRecord,
  readNoticeReceiverDraft,
  readNoticeReceiverId,
  readNoticeReceiverListQuery
} from './notice-receiver-data-provider-input';

export const noticeReceiverDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const page = await loadNoticeReceivers(readNoticeReceiverListQuery(params));
      return { data: adaptRefineRecords<TData>(page.content), total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readNoticeReceiverId(params.id);
      const receiver = await loadNoticeReceiver(id);
      if (receiver.id !== id) throw contractError('NOTICE_RECEIVER_REREAD_INVALID');
      return { data: adaptRefineRecord<TData>(receiver) };
    });
  },

  create<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    variables: TVariables;
  }): Promise<CreateResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const draft = readNoticeReceiverDraft(params.variables);
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
    return protect(async () => {
      assertResource(params.resource);
      const id = readNoticeReceiverId(params.id);
      const draft = readNoticeReceiverDraft(params.variables, id);
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
    return protect(async () => {
      assertResource(params.resource);
      const id = readNoticeReceiverId(params.id);
      const canonical = readNoticeReceiverDeleteRecord(params.variables, id);
      const mutation = await deleteNoticeReceiver(id);
      if (mutation.status === 'missing') throw contractError('NOTICE_RECEIVER_MISSING', 404);
      if (mutation.status !== 'deleted' || mutation.id !== id || mutation.receiver !== null) {
        throw contractError('NOTICE_RECEIVER_DELETE_NOT_CONFIRMED');
      }
      return { data: adaptRefineRecord<TData>(canonical) };
    });
  },

  getApiUrl: () => '/api/notice'
};

async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    if (reason instanceof NoticeReceiverContractError) {
      throw contractError('NOTICE_RECEIVER_RESPONSE_INVALID');
    }
    throw toRefineHttpError(reason);
  }
}

function assertResource(resource: string) {
  if (resource !== noticeReceiverResourceName) throw contractError('NOTICE_RECEIVER_RESOURCE_UNSUPPORTED', 400);
}

async function requireCanonical(id: number, draft: NoticeReceiverDraft) {
  const canonical = await loadNoticeReceiver(id);
  try {
    return requireNoticeReceiverConverged(canonical, id, draft);
  } catch {
    throw contractError('NOTICE_RECEIVER_REREAD_INVALID');
  }
}

async function requireCanonicalAfterMutation(mutation: NoticeReceiverMutation, draft: NoticeReceiverDraft) {
  try {
    return await requireCanonical(mutation.id, draft);
  } catch (reason) {
    const error =
      reason instanceof NoticeReceiverContractError
        ? contractError('NOTICE_RECEIVER_RESPONSE_INVALID')
        : toRefineHttpError(reason);
    throw attachNoticeReceiverMutation(error, mutation);
  }
}

function assertMutation(
  mutation: Awaited<ReturnType<typeof saveNoticeReceiver>>,
  expected: 'created' | 'updated',
  id?: number
) {
  if (mutation.status === 'missing') throw contractError('NOTICE_RECEIVER_MISSING', 404);
  if (
    mutation.status !== expected ||
    mutation.receiver === null ||
    mutation.receiver.id !== mutation.id ||
    (id !== undefined && mutation.id !== id)
  ) {
    throw contractError('NOTICE_RECEIVER_MUTATION_INVALID');
  }
}

function contractError(code: string, status = 502) {
  return createRefineHttpError('Notice receiver contract failed', status, code);
}
