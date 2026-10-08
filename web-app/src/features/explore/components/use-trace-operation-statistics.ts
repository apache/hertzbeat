/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
