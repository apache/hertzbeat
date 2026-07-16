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

export type LabelQuery = { search: string; pageIndex: number; pageSize: LabelPageSize };
export type LabelPageSize = typeof labelPageSizes[number];

export const labelPageSizes = [20, 50, 100] as const;

const defaultLabelQuery: LabelQuery = { search: '', pageIndex: 0, pageSize: 20 };

export function readLabelQuery(params: URLSearchParams): LabelQuery {
  return {
    search: params.get('search')?.trim() ?? defaultLabelQuery.search,
    pageIndex: readNonNegativeInteger(params.get('pageIndex')) ?? defaultLabelQuery.pageIndex,
    pageSize: readPageSize(params.get('pageSize')) ?? defaultLabelQuery.pageSize
  };
}

export function writeLabelQuery(query: LabelQuery) {
  const canonical = normalizeLabelQuery(query);
  const params = new URLSearchParams({
    pageIndex: String(canonical.pageIndex),
    pageSize: String(canonical.pageSize)
  });
  if (canonical.search) params.set('search', canonical.search);
  return params;
}

export function isLabelPageSize(value: number): value is LabelPageSize {
  return labelPageSizes.includes(value as LabelPageSize);
}

function normalizeLabelQuery(query: LabelQuery): LabelQuery {
  return readLabelQuery(new URLSearchParams({
    search: query.search,
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize)
  }));
}

function readNonNegativeInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function readPageSize(value: string | null): LabelPageSize | undefined {
  const parsed = readNonNegativeInteger(value);
  return parsed !== undefined && isLabelPageSize(parsed) ? parsed : undefined;
}
