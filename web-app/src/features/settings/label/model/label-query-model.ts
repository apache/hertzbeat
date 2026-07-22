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

import { readZeroBasedPage, writeZeroBasedPage } from '@/shared/query-context';

export type LabelQuery = { search: string; pageIndex: number; pageSize: LabelPageSize };
export type LabelPageSize = (typeof labelPageSizes)[number];
export type LabelDeletePageReceipt = { query: LabelQuery; visibleRecords: number };

export const labelPageSizes = [20, 50, 100] as const;

const defaultLabelQuery: LabelQuery = { search: '', pageIndex: 0, pageSize: 20 };

export function readLabelQuery(params: URLSearchParams): LabelQuery {
  const page = readZeroBasedPage(params, labelPageSizes, defaultLabelQuery.pageSize);
  return {
    search: params.get('search')?.trim() ?? defaultLabelQuery.search,
    ...page
  };
}

export function writeLabelQuery(query: LabelQuery) {
  const canonical = normalizeLabelQuery(query);
  const params = writeZeroBasedPage(canonical.pageIndex, canonical.pageSize);
  if (canonical.search) params.set('search', canonical.search);
  return params;
}

export function isLabelPageSize(value: number): value is LabelPageSize {
  return labelPageSizes.includes(value as LabelPageSize);
}

export function labelQueryAfterConfirmedDelete(current: LabelQuery, receipt: LabelDeletePageReceipt) {
  if (!sameLabelQuery(current, receipt.query) || current.pageIndex === 0 || receipt.visibleRecords !== 1) {
    return undefined;
  }
  return { ...current, pageIndex: current.pageIndex - 1 };
}

function normalizeLabelQuery(query: LabelQuery): LabelQuery {
  return readLabelQuery(
    new URLSearchParams({
      search: query.search,
      pageIndex: String(query.pageIndex),
      pageSize: String(query.pageSize)
    })
  );
}

function sameLabelQuery(left: LabelQuery, right: LabelQuery) {
  return left.search === right.search && left.pageIndex === right.pageIndex && left.pageSize === right.pageSize;
}
