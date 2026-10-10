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

export function readZeroBasedPage<S extends number>(
  params: URLSearchParams,
  pageSizes: readonly S[],
  defaultPageSize: S
) {
  return {
    pageIndex: readNonNegativeInteger(params.get('pageIndex')) ?? 0,
    pageSize: readMember(params.get('pageSize'), pageSizes) ?? defaultPageSize
  };
}

export function writeZeroBasedPage(pageIndex: number, pageSize: number, params = new URLSearchParams()) {
  params.set('pageIndex', String(pageIndex));
  params.set('pageSize', String(pageSize));
  return params;
}

export function zeroBasedPageChange(page: number, pageSize: number, currentPageSize: number) {
  return { pageIndex: pageSize === currentPageSize ? Math.max(0, page - 1) : 0, pageSize };
}

function readNonNegativeInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function readMember<S extends number>(value: string | null, members: readonly S[]) {
  const parsed = readNonNegativeInteger(value);
  return parsed !== undefined && members.includes(parsed as S) ? (parsed as S) : undefined;
}
