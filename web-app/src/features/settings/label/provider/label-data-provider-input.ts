/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalidVariables();
  const name = ownProperty(value, 'name');
  const tagValue = ownProperty(value, 'tagValue');
  const description = ownProperty(value, 'description');
  const type = ownProperty(value, 'type');
  if (typeof name !== 'string' || !name.trim()) invalidVariables();
  assertOptionalText(tagValue);
  assertOptionalText(description);
  assertLabelType(type);
  return {
    name,
    ...(tagValue === undefined ? {} : { tagValue }),
    ...(description === undefined ? {} : { description }),
    ...(type === undefined ? {} : { type })
  };
}

function assertOptionalText(value: unknown): asserts value is string | undefined {
  if (value !== undefined && typeof value !== 'string') invalidVariables();
}

function assertLabelType(value: unknown): asserts value is number | undefined {
  if (value === undefined) return;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 3) invalidVariables();
}

function ownProperty(value: object, key: string): unknown {
  return Object.hasOwn(value, key) ? Reflect.get(value, key) : undefined;
}

export function readLabelId(value: string | number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw createRefineHttpError('Label id is invalid', 400, 'LABEL_ID_INVALID');
  }
  return value;
}

export function readLabelDeleteRecords(ids: Array<string | number>, value: unknown): LabelRecord[] {
  if (!Array.isArray(value) || value.length === 0 || value.length !== ids.length) invalidVariables();
  const canonicalIds = ids.map(readLabelId);
  if (new Set(canonicalIds).size !== canonicalIds.length) invalidVariables();
  return value.map((record, index) => {
    const id = canonicalIds[index];
    if (id === undefined || !record || typeof record !== 'object' || Reflect.get(record, 'id') !== id)
      invalidVariables();
    return { ...readLabelDraft(record), id };
  });
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
