/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { listAgentScheduleOptions, listAgentSchedules } from '../api/agent-schedule-api';
import type { AgentScheduleOptions } from '../model/agent-schedule-contract';
import type { AgentScheduleListState } from '../model/agent-schedule-view-model';

const pageSize = 20;
const initialList: AgentScheduleListState = {
  kind: 'loading',
  items: [],
  total: 0,
  pageIndex: 0,
  pageSize
};

export function useAgentScheduleList() {
  const [list, setList] = useState<AgentScheduleListState>(initialList);
  const [options, setOptions] = useState<AgentScheduleOptions>({ receivers: [], templates: [] });
  const load = useCallback(async (nextPageIndex: number, nextPageSize: number, signal?: AbortSignal) => {
    setList(current => ({ ...current, kind: 'loading', pageIndex: nextPageIndex, pageSize: nextPageSize }));
    try {
      const [page, nextOptions] = await Promise.all([
        listAgentSchedules(nextPageIndex, nextPageSize, signal),
        listAgentScheduleOptions(signal)
      ]);
      setOptions(nextOptions);
      setList({
        kind: page.content.length === 0 ? 'empty' : 'ready',
        items: page.content,
        total: page.totalElements,
        pageIndex: page.number,
        pageSize: page.size
      });
    } catch {
      if (signal?.aborted) return;
      setList({ kind: 'error', items: [], total: 0, pageIndex: nextPageIndex, pageSize: nextPageSize });
    }
  }, []);
  useInitialScheduleLoad(load);
  const reload = useCallback(() => load(list.pageIndex, list.pageSize), [list.pageIndex, list.pageSize, load]);
  return { list, options, load, reload };
}

function useInitialScheduleLoad(load: (pageIndex: number, pageSize: number, signal?: AbortSignal) => Promise<void>) {
  useEffect(() => {
    const request = new AbortController();
    queueMicrotask(() => {
      if (!request.signal.aborted) void load(0, pageSize, request.signal);
    });
    return () => request.abort();
  }, [load]);
}
