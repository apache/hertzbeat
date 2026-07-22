/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { GetListParams } from '@refinedev/core';

import { createRefineHttpError } from '@/shared/refine/refine-http-error';

import { labelResourceName, type LabelIdentity, type LabelRecord } from '../model/label-model';
import { isLabelPageSize } from '../model/label-query-model';

/** Validates Refine-shaped input before the Label provider can reach transport. */
export function assertLabelResource(resource: string) {
  if (resource !== labelResourceName) {
    throw createRefineHttpError('Unsupported Label resource', 400, 'LABEL_RESOURCE_UNSUPPORTED');
  }
}

export function readLabelListQuery(params: GetListParams) {
  assertNoSorters(params.sorters);
  const { currentPage, pageSize } = readPagination(params.pagination);
  return { search: readSearchFilter(params.filters), pageIndex: currentPage - 1, pageSize };
}

export function readLabelDraft(value: unknown): Partial<LabelRecord> & Pick<LabelRecord, 'name'> {
  if (!value || typeof value !== 'object') invalidVariables();
  const draft = value as Partial<LabelRecord>;
  if (typeof draft.name !== 'string' || !draft.name.trim()) invalidVariables();
  assertOptionalText(draft.tagValue);
  assertOptionalText(draft.description);
  assertLabelType(draft.type);
  return draft as Partial<LabelRecord> & Pick<LabelRecord, 'name'>;
}

function assertOptionalText(value: unknown) {
  if (value !== undefined && typeof value !== 'string') invalidVariables();
}

function assertLabelType(value: unknown) {
  if (value === undefined) return;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 3) invalidVariables();
}

export function readLabelId(value: string | number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw createRefineHttpError('Label id is invalid', 400, 'LABEL_ID_INVALID');
  }
  return value;
}

export function toLabelIdentity(label: LabelIdentity, id?: number): LabelIdentity {
  const canonicalId = id ?? label.id;
  return {
    ...(canonicalId === undefined ? {} : { id: canonicalId }),
    name: label.name.trim(),
    tagValue: label.tagValue?.trim() ?? ''
  };
}

function assertNoSorters(sorters: GetListParams['sorters']) {
  if (sorters && sorters.length > 0) {
    throw createRefineHttpError('Label sorting is not supported', 400, 'LABEL_SORT_UNSUPPORTED');
  }
}

function readPagination(pagination: GetListParams['pagination']) {
  if (pagination?.mode && pagination.mode !== 'server') {
    throw createRefineHttpError('Label pagination mode is not supported', 400, 'LABEL_PAGINATION_UNSUPPORTED');
  }
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? 20;
  if (!Number.isInteger(currentPage) || currentPage < 1 || !isLabelPageSize(pageSize)) {
    throw createRefineHttpError('Label pagination is invalid', 400, 'LABEL_PAGINATION_INVALID');
  }
  return { currentPage, pageSize };
}

function readSearchFilter(filters: GetListParams['filters']) {
  if (!filters || filters.length === 0) return '';
  const [filter] = filters;
  if (
    filters.length !== 1 ||
    !filter ||
    !('field' in filter) ||
    filter.field !== 'search' ||
    filter.operator !== 'contains' ||
    typeof filter.value !== 'string'
  ) {
    throw createRefineHttpError('Label filter is not supported', 400, 'LABEL_FILTER_UNSUPPORTED');
  }
  return filter.value.trim();
}

function invalidVariables(): never {
  throw createRefineHttpError('Label variables are invalid', 400, 'LABEL_VARIABLES_INVALID');
}
