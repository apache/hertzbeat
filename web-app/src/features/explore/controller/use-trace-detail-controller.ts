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

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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
type Selection = OpenTrace & { spanId: string };

export function useTraceDetailController(query: TraceExploreQuery, openPath: (path: string) => void) {
  const client = useQueryClient();
  const scopeKey = exploreEvidenceScopeKey(query);
  const [openTraceState, setOpenTraceState] = useState<OpenTrace>();
  const [selection, setSelection] = useState<Selection>();
  const traceId = openTraceState?.scopeKey === scopeKey ? openTraceState.traceId : undefined;
  const detailQuery = useQuery({
    queryKey: exploreQueryKeys.detail(scopeKey, traceId),
    queryFn: ({ signal }) => loadTraceDetail(traceId ?? '', signal),
    enabled: Boolean(traceId),
    retry: false
  });
  const state = resolveTraceDetailState(
    scopeKey,
    traceId,
    selection,
    detailQuery.isPending,
    detailQuery.error,
    detailQuery.data
  );

  const cancel = (opened: OpenTrace | undefined) => {
    if (opened) {
      void client.cancelQueries({ queryKey: exploreQueryKeys.detail(opened.scopeKey, opened.traceId), exact: true });
    }
  };
  const openTrace = (nextTraceId: string) => {
    if (!nextTraceId || (nextTraceId === traceId && openTraceState?.scopeKey === scopeKey)) return;
    cancel(openTraceState);
    setSelection(undefined);
    setOpenTraceState({ scopeKey, traceId: nextTraceId });
  };
  const close = () => {
    cancel(openTraceState);
    setSelection(undefined);
    setOpenTraceState(undefined);
  };
  const selectSpan = (spanId: string) => {
    if (state.kind === 'ready' && state.spans.some(span => span.spanId === spanId)) {
      setSelection({ scopeKey, traceId: state.traceId, spanId });
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
    openTrace,
    close,
    selectSpan,
    retry: () => detailQuery.refetch().then(() => undefined),
    changePage: (page: number) => openPath(buildExplorePath({ ...query, pageIndex: page - 1 || undefined })),
    openRelatedLogs,
    openRelatedMetrics
  };
}

function resolveTraceDetailState(
  scopeKey: string,
  traceId: string | undefined,
  selection: Selection | undefined,
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
  const selected =
    selection?.scopeKey === scopeKey && selection.traceId === traceId
      ? (spans.find(span => span.spanId === selection.spanId) ?? spans[0])
      : spans[0];
  return { kind: 'ready', traceId, detail, spans, selected };
}
