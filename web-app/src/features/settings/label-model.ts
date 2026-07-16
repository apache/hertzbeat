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
export const labelPageSizes = [20, 50, 100] as const;

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

export function buildLabelDisplayName(label: Pick<LabelRecord, 'name' | 'tagValue'>) {
  const value = label.tagValue?.trim();
  return value ? `${label.name}:${value}` : label.name;
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

export function labelTypeKey(type?: number) {
  if (type === 0) return 'labels.type.auto';
  if (type === 2) return 'labels.type.preset';
  return 'labels.type.user';
}
