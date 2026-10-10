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

import { useMemo, useState } from 'react';
import {
  compareOperationGroups,
  traceOperationStatistics,
  type OperationSort,
  type OperationSpan
} from '../model/trace-operation-statistics';
import { TRACE_OPERATION_PAGE_SIZE as PAGE_SIZE } from './trace-operation-statistics-primitives';
export function useTraceOperationStatistics(props: { spans: readonly OperationSpan[]; partial: boolean }) {
  const data = useMemo(
    () => traceOperationStatistics(props.spans, { partial: props.partial }),
    [props.spans, props.partial]
  );
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<OperationSort>('sum');
  const [page, setPage] = useState(0);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const groups = useMemo(
    () =>
      data.groups
        .filter(group => !filter || [group.serviceName, group.spanName].some(value => value?.includes(filter)))
        .sort((a, b) => compareOperationGroups(a, b, sort)),
    [data.groups, filter, sort]
  );
  const selected = data.groups.find(group => group.key === groupKey);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(groups.length / PAGE_SIZE) - 1));
  return {
    data,
    groups,
    selected,
    currentPage,
    filter,
    sort,
    groupKey,
    onFilter: (value: string) => {
      setFilter(value);
      setPage(0);
    },
    onSort: (value: OperationSort) => {
      setSort(value);
      setPage(0);
    },
    onOpen: (key: string) => setGroupKey(key),
    onPage: setPage,
    onClose: () => setGroupKey(null)
  };
}
