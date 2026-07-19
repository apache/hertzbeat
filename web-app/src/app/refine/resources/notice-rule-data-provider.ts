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
  deleteNoticeRule,
  isNoticeRuleMissing,
  loadAllNoticeRulesByName,
  loadNoticeRule,
  loadNoticeRules,
  NoticeRuleContractError,
  saveNoticeRule
} from '@/features/alert/notice-rule/api/notice-rule-api';
import { parseNoticeRuleMutationVariables } from '@/features/alert/notice-rule/api/notice-rule-schema';
import {
  noticeRuleMatchesDraft,
  noticeRulePageSizes,
  validateNoticeRuleDependencies,
  validateNoticeRuleDraft,
  type NoticeRuleMutationVariables,
  type NoticeRuleQuery
} from '@/features/alert/notice-rule/model/notice-rule-model';
import { exposeRefineProviderData } from '@/shared/refine/refine-provider-data';

import { createRefineHttpError, toRefineHttpError } from '../refine-http-error';

export const noticeRuleResourceName = 'notice-rules';

export const noticeRuleDataProvider: DataProvider = {
  getList<TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const page = await loadNoticeRules(readListQuery(params));
      return { data: exposeRefineProviderData<TData[]>(page.content), total: page.totalElements };
    });
  },

  getOne<TData extends BaseRecord = BaseRecord>(params: {
    resource: string;
    id: string | number;
  }): Promise<GetOneResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const id = readId(params.id);
      return { data: exposeRefineProviderData<TData>(await loadNoticeRule(id)) };
    });
  },

  create<TData extends BaseRecord = BaseRecord, TVariables = object>(params: {
    resource: string;
    variables: TVariables;
  }): Promise<CreateResponse<TData>> {
    return protect(async () => {
      assertResource(params.resource);
      const variables = readMutationVariables(params.variables);
      if (variables.draft.id !== undefined) throw contractError('NOTICE_RULE_VARIABLES_INVALID', 400);
      const before = await loadAllNoticeRulesByName(variables.draft.name.trim());
      const previousIds = new Set(before.map(rule => rule.id));
      await saveNoticeRule(variables.draft, variables.receivers, variables.templates);
      const after = await loadAllNoticeRulesByName(variables.draft.name.trim());
      const created = after.filter(
        rule =>
          !previousIds.has(rule.id) &&
          noticeRuleMatchesDraft(rule, variables.draft, variables.receivers, variables.templates)
      );
      if (created.length !== 1) throw contractError('NOTICE_RULE_CREATE_NOT_CONVERGED');
      return { data: exposeRefineProviderData<TData>(created[0]) };
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
      const variables = readMutationVariables(params.variables, id);
      await saveNoticeRule(variables.draft, variables.receivers, variables.templates);
      const canonical = await loadNoticeRule(id);
      if (!noticeRuleMatchesDraft(canonical, variables.draft, variables.receivers, variables.templates)) {
        throw contractError('NOTICE_RULE_UPDATE_NOT_CONVERGED');
      }
      return { data: exposeRefineProviderData<TData>(canonical) };
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
      const canonical = await loadNoticeRule(id);
      await deleteNoticeRule(id);
      try {
        await loadNoticeRule(id);
        throw contractError('NOTICE_RULE_DELETE_NOT_CONVERGED');
      } catch (error) {
        if (!isNoticeRuleMissing(error)) throw error;
      }
      return { data: exposeRefineProviderData<TData>(canonical) };
    });
  },

  getApiUrl: () => '/api/notice'
};

async function protect<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isNoticeRuleMissing(error)) {
      throw contractError('NOTICE_RULE_MISSING', 404);
    }
    if (error instanceof NoticeRuleContractError) {
      throw contractError(error.code);
    }
    throw toRefineHttpError(error);
  }
}

function assertResource(resource: string) {
  if (resource !== noticeRuleResourceName) throw contractError('NOTICE_RULE_RESOURCE_UNSUPPORTED', 400);
}

function readListQuery(params: GetListParams): NoticeRuleQuery {
  if (params.sorters?.length) throw contractError('NOTICE_RULE_SORT_UNSUPPORTED', 400);
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
    throw contractError('NOTICE_RULE_PAGINATION_INVALID', 400);
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
    throw contractError('NOTICE_RULE_FILTER_UNSUPPORTED', 400);
  }
  return { name: filter.value.trim() };
}

function readMutationVariables(value: unknown, id?: number): NoticeRuleMutationVariables {
  let candidate: NoticeRuleMutationVariables;
  try {
    candidate = parseNoticeRuleMutationVariables(value);
  } catch {
    throw contractError('NOTICE_RULE_VARIABLES_INVALID', 400);
  }
  if (
    validateNoticeRuleDraft(candidate.draft).length ||
    validateNoticeRuleDependencies(candidate.draft, candidate.receivers, candidate.templates).length ||
    (id === undefined ? candidate.draft.id !== undefined : candidate.draft.id !== id)
  ) {
    throw contractError('NOTICE_RULE_VARIABLES_INVALID', 400);
  }
  return candidate;
}

function readId(value: string | number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw contractError('NOTICE_RULE_ID_INVALID', 400);
  }
  return value;
}

function contractError(code: string, status = 502) {
  return createRefineHttpError('Notice rule contract failed', status, code);
}
