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
import {
  expectedNoticeReceiverEvidence,
  type NoticeReceiverDraft
} from '@/features/alert/notice-receiver/model/notice-receiver-model';
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
      const canonical = await requireCanonical(mutation.id, draft);
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
      const canonical = await requireCanonical(id, draft);
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
  const expected = expectedNoticeReceiverEvidence(draft);
  if (
    canonical.id !== id ||
    canonical.name !== draft.name.trim() ||
    canonical.type !== draft.type ||
    !sameRecord(canonical.options, expected.options) ||
    !sameStrings(canonical.configuredSecrets, expected.configuredSecrets)
  ) {
    throw contractError('NOTICE_RECEIVER_REREAD_INVALID');
  }
  return canonical;
}

function sameRecord(actual: Record<string, unknown>, expected: Record<string, unknown>) {
  const keys = [...new Set([...Object.keys(actual), ...Object.keys(expected)])];
  return keys.every(key => actual[key] === expected[key]);
}

function sameStrings(actual: readonly string[], expected: readonly string[]) {
  const actualValues = new Set(actual);
  const expectedValues = new Set(expected);
  return (
    actualValues.size === actual.length &&
    expectedValues.size === expected.length &&
    actualValues.size === expectedValues.size &&
    actual.every(item => expectedValues.has(item))
  );
}

function assertMutation(
  mutation: Awaited<ReturnType<typeof saveNoticeReceiver>>,
  expected: 'created' | 'updated',
  id?: number
) {
  if (mutation.status === 'missing') throw contractError('NOTICE_RECEIVER_MISSING', 404);
  if (
    mutation.status !== expected ||
    mutation.receiver == null ||
    mutation.receiver.id !== mutation.id ||
    (id !== undefined && mutation.id !== id)
  ) {
    throw contractError('NOTICE_RECEIVER_MUTATION_INVALID');
  }
}

function contractError(code: string, status = 502) {
  return createRefineHttpError('Notice receiver contract failed', status, code);
}
