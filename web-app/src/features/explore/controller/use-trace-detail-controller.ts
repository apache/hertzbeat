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

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { classifyExploreSignalError, loadTraceDetail } from '../api/explore-api';
import {
  buildCrossSignalPath,
  buildExplorePath,
  exploreEvidenceScopeKey,
  mergeExploreQuery,
  type TraceExploreQuery
} from '../model/explore-model';
import { traceSpanLayout, type TraceDetailState } from '../model/explore-signal-model';
import { exploreQueryKeys } from './explore-query-keys';

type OpenTrace = { scopeKey: string; traceId: string };
type ScopedTraceSelection = OpenTrace & { spanId?: string | undefined };

export function useTraceDetailController(query: TraceExploreQuery, openPath: (path: string) => void) {
  const scopeKey = exploreEvidenceScopeKey(query);
  const selection = useScopedTraceSelection(scopeKey);
  const detailQuery = useQuery({
    queryKey: exploreQueryKeys.detail(scopeKey, selection.traceId),
    queryFn: ({ signal }) => loadTraceDetail(selection.traceId ?? '', signal),
    enabled: Boolean(selection.traceId),
    retry: false
  });
  const state = resolveTraceDetailState(
    selection.traceId,
    selection.spanId,
    detailQuery.isPending,
    detailQuery.error,
    detailQuery.data
  );

  const selectSpan = (spanId: string) => {
    if (state.kind === 'ready' && state.spans.some(span => span.spanId === spanId)) {
      selection.selectSpan(spanId);
    }
  };
  const openRelatedLogs = () => {
    if (state.kind === 'ready') openPath(buildCrossSignalPath(query, 'logs', { traceId: state.detail.traceId }));
  };
  const openRelatedMetrics = () => {
    if (state.kind !== 'ready') return;
    openPath(
      buildExplorePath(
        mergeExploreQuery(query, {
          signal: 'metrics',
          serviceName: state.selected?.serviceName ?? state.detail.serviceName ?? undefined,
          query: undefined,
          traceId: undefined,
          pageIndex: undefined
        })
      )
    );
  };
  return {
    state,
    openTrace: selection.openTrace,
    close: selection.close,
    selectSpan,
    retry: () => detailQuery.refetch().then(() => undefined),
    changePage: (page: number) => openPath(buildExplorePath({ ...query, pageIndex: page - 1 || undefined })),
    openRelatedLogs,
    openRelatedMetrics
  };
}

function useScopedTraceSelection(scopeKey: string) {
  const client = useQueryClient();
  const [stored, setStored] = useState<ScopedTraceSelection>();
  const storedRef = useRef(stored);
  const current = stored?.scopeKey === scopeKey ? stored : undefined;

  useEffect(() => {
    storedRef.current = stored;
  }, [stored]);

  useEffect(() => {
    const stale = storedRef.current;
    if (stale && stale.scopeKey !== scopeKey) {
      cancelTraceDetail(client, stale);
      setStored(value => (value?.scopeKey === scopeKey ? value : undefined));
    }
    return () => {
      const opened = storedRef.current;
      if (opened?.scopeKey === scopeKey) cancelTraceDetail(client, opened);
    };
  }, [client, scopeKey]);

  const replace = (next: ScopedTraceSelection | undefined) => {
    storedRef.current = next;
    setStored(next);
  };
  const openTrace = (traceId: string) => {
    if (!traceId || traceId === current?.traceId) return;
    cancelTraceDetail(client, current);
    replace({ scopeKey, traceId });
  };
  const close = () => {
    cancelTraceDetail(client, current);
    replace(undefined);
  };
  const selectSpan = (spanId: string) => {
    if (current) replace({ ...current, spanId });
  };
  return { traceId: current?.traceId, spanId: current?.spanId, openTrace, close, selectSpan };
}

function cancelTraceDetail(client: QueryClient, opened: OpenTrace | undefined) {
  if (!opened) return;
  // Cancellation uses the exact scope and trace identity that started the request.
  void client.cancelQueries({ queryKey: exploreQueryKeys.detail(opened.scopeKey, opened.traceId), exact: true });
}

function resolveTraceDetailState(
  traceId: string | undefined,
  selectedSpanId: string | undefined,
  pending: boolean,
  error: Error | null,
  detail: Awaited<ReturnType<typeof loadTraceDetail>> | undefined
): TraceDetailState {
  if (!traceId) return { kind: 'closed' };
  if (pending) return { kind: 'loading', traceId };
  if (error) {
    const kind = classifyExploreSignalError(error);
    if (kind === 'missing') return { kind, traceId };
    if (kind === 'transport_error') return { kind: 'unavailable', traceId };
    return { kind: 'error', traceId };
  }
  if (!detail || detail.traceId !== traceId) return { kind: 'error', traceId };
  const spans = traceSpanLayout(detail);
  const selected = selectedSpanId ? (spans.find(span => span.spanId === selectedSpanId) ?? spans[0]) : spans[0];
  return { kind: 'ready', traceId, detail, spans, selected };
}
