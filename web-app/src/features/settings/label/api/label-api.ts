/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut, type PageResult } from '@/core/http/api-message';

export type LabelRecord = {
  id?: number;
  name: string;
  tagValue?: string;
  description?: string;
  type?: number;
  creator?: string;
  gmtCreate?: number | string;
  gmtUpdate?: number | string;
};

export type LabelQuery = { search: string; pageIndex: number; pageSize: number };
export type LabelIdentity = Pick<LabelRecord, 'name' | 'tagValue'> & { id?: number };
export const labelPageSizes = [20, 50, 100] as const;

export function loadLabels(query: LabelQuery) {
  return apiMessageGet<PageResult<LabelRecord>>(buildLabelListPath(query));
}

export function saveLabel(label: Partial<LabelRecord>, isNew: boolean) {
  const payload = buildLabelPayload(label, isNew);
  return isNew ? apiMessagePost<void>('/api/label', payload) : apiMessagePut<void>('/api/label', payload);
}

export function deleteLabel(id: number) {
  return apiMessageDelete<void>(`/api/label?ids=${encodeURIComponent(id)}`);
}

export async function findCanonicalLabel(identity: LabelIdentity) {
  const expectedName = identity.name.trim();
  const expectedValue = normalizeLabelValue(identity.tagValue);
  let pageIndex = 0;
  let totalPages = 1;

  do {
    const page = await loadLabels({ search: expectedName, pageIndex, pageSize: 100 });
    const match = page.content.find(label => (
      (identity.id === undefined || label.id === identity.id)
      && label.name.trim() === expectedName
      && normalizeLabelValue(label.tagValue) === expectedValue
    ));
    if (match) return match;
    totalPages = Number.isInteger(page.totalPages) && page.totalPages > 0 ? page.totalPages : 1;
    pageIndex += 1;
  } while (pageIndex < totalPages);

  return undefined;
}

export function readLabelQuery(params: URLSearchParams): LabelQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const requestedSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: labelPageSizes.includes(requestedSize as typeof labelPageSizes[number]) ? requestedSize : 20
  };
}

export function writeLabelQuery(query: LabelQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}

export function buildLabelListPath(query: LabelQuery) {
  return `/api/label?${writeLabelQuery(query).toString()}`;
}

export function buildLabelPayload(label: Partial<LabelRecord>, isNew: boolean): LabelRecord {
  return {
    ...(!isNew && label.id ? { id: label.id } : {}),
    name: label.name?.trim() ?? '',
    tagValue: label.tagValue?.trim() ?? '',
    description: label.description?.trim() ?? '',
    type: isNew ? 1 : label.type ?? 1
  };
}

function normalizeLabelValue(value?: string) {
  return value?.trim() ?? '';
}
