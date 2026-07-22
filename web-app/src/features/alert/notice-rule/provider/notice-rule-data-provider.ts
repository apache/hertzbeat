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

import { noticeApiEndpoint } from '@/features/alert/notice-api-endpoints';
import { adaptRefineRecord, adaptRefineRecords } from '@/shared/refine/refine-provider-data';

import { loadNoticeRule, loadNoticeRules } from '../api/notice-rule-api';
import { parseNoticeRuleMutationVariables } from '../api/notice-rule-schema';
import {
  NoticeRuleContractError,
  noticeRuleFailureKind,
  noticeRuleProviderMissingFailure,
  preserveNoticeRuleFailure
} from '../model/notice-rule-failure';
import {
  noticeRulePageSizes,
  validateNoticeRuleDependencies,
  validateNoticeRuleDraft,
  type NoticeRuleMutationVariables,
  type NoticeRuleQuery
} from '../model/notice-rule-model';
import { noticeRuleResourceName } from '../notice-rule-resource';
import {
  createNoticeRuleRecord,
  deleteNoticeRuleRecord,
  updateNoticeRuleRecord
} from './notice-rule-provider-operations';

export const noticeRuleDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protectRead(async () => {
      assertResource(params.resource);
      const page = await loadNoticeRules(readListQuery(params));
      return { data: adaptRefineRecords<TData>(page.content), total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protectRead(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      return { data: adaptRefineRecord<TData>(await loadNoticeRule(id)) };
    });
  },

  create<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    variables: TVariables;
  }): Promise<CreateResponse<TData>> {
    return createRecord(params);
  },

  update<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables: TVariables;
  }): Promise<UpdateResponse<TData>> {
    return updateRecord(params);
  },

  deleteOne<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    id: string | number;
    variables?: TVariables;
  }): Promise<DeleteOneResponse<TData>> {
    return deleteRecord(params);
  },

  getApiUrl: () => noticeApiEndpoint
};

async function createRecord<TData extends BaseRecord, TVariables>(params: {
  resource: string;
  variables: TVariables;
}): Promise<CreateResponse<TData>> {
  assertResource(params.resource);
  const variables = readMutationVariables(params.variables);
  if (variables.draft.id !== undefined) throw contractError('NOTICE_RULE_VARIABLES_INVALID');
  return createNoticeRuleRecord<TData>(variables);
}

async function updateRecord<TData extends BaseRecord, TVariables>(params: {
  resource: string;
  id: string | number;
  variables: TVariables;
}): Promise<UpdateResponse<TData>> {
  assertResource(params.resource);
  const id = readId(params.id);
  const variables = readMutationVariables(params.variables, id);
  return updateNoticeRuleRecord<TData>(id, variables);
}

async function deleteRecord<TData extends BaseRecord, TVariables>(params: {
  resource: string;
  id: string | number;
  variables?: TVariables;
}): Promise<DeleteOneResponse<TData>> {
  assertResource(params.resource);
  const id = readId(params.id);
  return deleteNoticeRuleRecord<TData>(id);
}

async function protectRead<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const kind = noticeRuleFailureKind(error);
    throw kind === 'missing' ? noticeRuleProviderMissingFailure() : preserveNoticeRuleFailure(error, kind);
  }
}

/*
 * Input readers below are deliberately synchronous: failures occur before a
 * provider method can issue transport and are therefore definitely rejected.
 */

function assertResource(resource: string) {
  if (resource !== noticeRuleResourceName) throw contractError('NOTICE_RULE_RESOURCE_UNSUPPORTED');
}

function readListQuery(params: GetListParams): NoticeRuleQuery {
  if (params.sorters?.length) throw contractError('NOTICE_RULE_SORT_UNSUPPORTED');
  return { ...readNameFilter(params.filters), ...readPagination(params.pagination) };
}

function readPagination(pagination: GetListParams['pagination']) {
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? 8;
  if (
    (pagination?.mode && pagination.mode !== 'server') ||
    !Number.isSafeInteger(currentPage) ||
    currentPage < 1 ||
    !noticeRulePageSizes.includes(pageSize as (typeof noticeRulePageSizes)[number])
  ) {
    throw contractError('NOTICE_RULE_PAGINATION_INVALID');
  }
  return { pageIndex: currentPage - 1, pageSize };
}

function readNameFilter(filters: GetListParams['filters']) {
  if (!filters?.length) return { name: '' };
  const [filter] = filters;
  if (
    filters.length !== 1 ||
    !filter ||
    !('field' in filter) ||
    filter.field !== 'name' ||
    filter.operator !== 'contains' ||
    typeof filter.value !== 'string'
  ) {
    throw contractError('NOTICE_RULE_FILTER_UNSUPPORTED');
  }
  return { name: filter.value.trim() };
}

function readMutationVariables(value: unknown, id?: number): NoticeRuleMutationVariables {
  let candidate: NoticeRuleMutationVariables;
  try {
    candidate = parseNoticeRuleMutationVariables(value);
  } catch {
    throw contractError('NOTICE_RULE_VARIABLES_INVALID');
  }
  if (
    validateNoticeRuleDraft(candidate.draft).length ||
    validateNoticeRuleDependencies(candidate.draft, candidate.receivers, candidate.templates).length ||
    (id === undefined ? candidate.draft.id !== undefined : candidate.draft.id !== id)
  ) {
    throw contractError('NOTICE_RULE_VARIABLES_INVALID');
  }
  return candidate;
}

function readId(value: string | number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw contractError('NOTICE_RULE_ID_INVALID');
  }
  return value;
}

function contractError(code: string) {
  return new NoticeRuleContractError(code);
}
