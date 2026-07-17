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
  classifyNoticeReceiverError,
  loadNoticeReceiver,
  loadNoticeReceivers,
  NoticeReceiverContractError,
  saveNoticeReceiver
} from '@/features/alert/notice-receiver/api/notice-receiver-api';
import {
  noticeReceiverPageSizes,
  createNoticeReceiverDraft,
  expectedNoticeReceiverEvidence,
  receiverTypeDefinitions,
  validateNoticeReceiverDraft,
  type NoticeReceiver,
  type NoticeReceiverDraft,
  type NoticeReceiverQuery
} from '@/features/alert/notice-receiver/model/notice-receiver-model';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';

export const noticeReceiverResourceName = 'notice-receivers';

export const noticeReceiverDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const page = await loadNoticeReceivers(readListQuery(params));
      return { data: page.content as unknown as TData[], total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      const receiver = await loadNoticeReceiver(id);
      if (receiver.id !== id) throw contractError('NOTICE_RECEIVER_REREAD_INVALID');
      return { data: receiver as unknown as TData };
    });
  },

  create<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    variables: TVariables;
  }): Promise<CreateResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const draft = readDraft(params.variables);
      if (draft.id !== undefined) throw contractError('NOTICE_RECEIVER_VARIABLES_INVALID', 400);
      const mutation = await saveNoticeReceiver(draft);
      assertMutation(mutation, 'created');
      const canonical = await requireCanonical(mutation.id, draft);
      return { data: canonical as unknown as TData };
    });
  },

  update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      const draft = readDraft(params.variables, id);
      const mutation = await saveNoticeReceiver(draft);
      assertMutation(mutation, 'updated', id);
      const canonical = await requireCanonical(id, draft);
      return { data: canonical as unknown as TData };
    });
  },

  deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      const canonical = readDeleteRecord(params.variables, id);
      const mutation = await deleteNoticeReceiver(id);
      if (mutation.status === 'missing') throw contractError('NOTICE_RECEIVER_MISSING', 404);
      if (mutation.status !== 'deleted' || mutation.id !== id || mutation.receiver !== null) {
        throw contractError('NOTICE_RECEIVER_DELETE_NOT_CONFIRMED');
      }
      try {
        await loadNoticeReceiver(id);
        throw contractError('NOTICE_RECEIVER_DELETE_NOT_CONFIRMED');
      } catch (error) {
        if (classifyNoticeReceiverError(error) !== 'missing') throw error;
      }
      return { data: canonical as unknown as TData };
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

function readListQuery(params: GetListParams): NoticeReceiverQuery {
  if (params.sorters?.length) throw contractError('NOTICE_RECEIVER_SORT_UNSUPPORTED', 400);
  const { currentPage, pageSize } = readPagination(params.pagination);
  return { name: readNameFilter(params.filters), pageIndex: currentPage - 1, pageSize };
}

function readPagination(pagination: GetListParams['pagination']) {
  if (pagination?.mode && pagination.mode !== 'server') {
    throw contractError('NOTICE_RECEIVER_PAGINATION_UNSUPPORTED', 400);
  }
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? 8;
  if (!Number.isSafeInteger(currentPage) || currentPage < 1) {
    throw contractError('NOTICE_RECEIVER_PAGINATION_INVALID', 400);
  }
  if (!noticeReceiverPageSizes.includes(pageSize as (typeof noticeReceiverPageSizes)[number])) {
    throw contractError('NOTICE_RECEIVER_PAGINATION_INVALID', 400);
  }
  return { currentPage, pageSize };
}

function readNameFilter(filters: GetListParams['filters']) {
  if (!filters?.length) return '';
  const [filter] = filters;
  if (filters.length !== 1 || !filter || !('field' in filter) || filter.field !== 'name'
    || filter.operator !== 'contains' || typeof filter.value !== 'string') {
    throw contractError('NOTICE_RECEIVER_FILTER_UNSUPPORTED', 400);
  }
  return filter.value.trim();
}

function readId(value: string | number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw contractError('NOTICE_RECEIVER_ID_INVALID', 400);
  }
  return value;
}

function readDraft(value: unknown, id?: number): NoticeReceiverDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('NOTICE_RECEIVER_VARIABLES_INVALID', 400);
  }
  const draft = value as Partial<NoticeReceiverDraft>;
  const baseline = createNoticeReceiverDraft();
  const shapeValid = Object.entries(baseline).every(([key, expected]) => {
    const actual = draft[key as keyof NoticeReceiverDraft];
    if (Array.isArray(expected)) return Array.isArray(actual) && actual.every(item => typeof item === 'string');
    if (expected === null) return actual === null || typeof actual === 'number';
    return typeof actual === typeof expected;
  });
  if ((id === undefined && draft.id !== undefined) || (id !== undefined && draft.id !== id)
    || !shapeValid || !receiverTypeDefinitions.some(item => item.type === draft.type)
    || validateNoticeReceiverDraft(draft as NoticeReceiverDraft).length > 0) {
    throw contractError('NOTICE_RECEIVER_VARIABLES_INVALID', 400);
  }
  return draft as NoticeReceiverDraft;
}

function readDeleteRecord(value: unknown, id: number): NoticeReceiver {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value as Partial<NoticeReceiver>).id !== id) {
    throw contractError('NOTICE_RECEIVER_VARIABLES_INVALID', 400);
  }
  return value as NoticeReceiver;
}

async function requireCanonical(id: number, draft: NoticeReceiverDraft) {
  const canonical = await loadNoticeReceiver(id);
  const expected = expectedNoticeReceiverEvidence(draft);
  if (canonical.id !== id || canonical.name !== draft.name.trim() || canonical.type !== draft.type
    || !sameRecord(canonical.options, expected.options)
    || !sameStrings(canonical.configuredSecrets, expected.configuredSecrets)) {
    throw contractError('NOTICE_RECEIVER_REREAD_INVALID');
  }
  return canonical;
}

function sameRecord(actual: Record<string, unknown>, expected: Record<string, unknown>) {
  const keys = [...new Set([...Object.keys(actual), ...Object.keys(expected)])];
  return keys.every(key => actual[key] === expected[key]);
}

function sameStrings(actual: readonly string[], expected: readonly string[]) {
  return actual.length === expected.length && actual.every(item => expected.includes(item));
}

function assertMutation(
  mutation: Awaited<ReturnType<typeof saveNoticeReceiver>>,
  expected: 'created' | 'updated',
  id?: number
) {
  if (mutation.status === 'missing') throw contractError('NOTICE_RECEIVER_MISSING', 404);
  if (mutation.status !== expected || mutation.receiver == null || mutation.receiver.id !== mutation.id
    || (id !== undefined && mutation.id !== id)) {
    throw contractError('NOTICE_RECEIVER_MUTATION_INVALID');
  }
}

function contractError(code: string, status = 502) {
  return createRefineHttpError('Notice receiver contract failed', status, code);
}
