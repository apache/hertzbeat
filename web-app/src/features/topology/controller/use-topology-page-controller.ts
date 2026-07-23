/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { ExactTimeWindow } from '@/shared/query-context';

import { classifyTopologyError, loadTopologyGraph } from '../api/topology-api';
import {
  changeTopologyPage,
  changeTopologyScope,
  parseTopologyQuery,
  withTopologyPageDefaults,
  writeTopologyQuery,
  type TopologyFailure,
  type TopologyQuery,
  type TopologyScopePatch
} from '../model/topology-model';
import type { TopologyPageController, TopologyPageEvidence, TopologyPageState } from '../model/topology-page-contract';
import {
  buildTopologyPresentation,
  type TopologyInteraction,
  type TopologyPresentation
} from '../model/topology-view-model';
import { topologyQueryKeys } from './topology-query-keys';
import { useTopologyInteraction } from './use-topology-interaction';

type ControllerOptions = { effectiveWindow?: ExactTimeWindow; refreshRevision?: number };
type SettledGraph = { semanticScope: string; presentation: TopologyPresentation };
const invalidQueryKey = ['topology', 'invalid'] as const;

export function useTopologyPageController(options: ControllerOptions = {}): TopologyPageController {
  const [params, setParams] = useSearchParams();
  const request = resolveTopologyRequest(params, options.effectiveWindow, options.refreshRevision ?? 0);
  const semanticScope = request?.semanticScope ?? 'invalid';
  const result = useQuery({
    queryKey: request?.key ?? invalidQueryKey,
    queryFn: request ? ({ signal }) => loadTopologyGraph(request.query, signal) : skipToken,
    retry: false,
    staleTime: 0
  });
  const fetched = useMemo(() => (result.data ? buildTopologyPresentation(result.data) : undefined), [result.data]);
  const presentation = useSettledTopologyGraph(semanticScope, fetched, result.isFetching, result.error);
  const interaction = useTopologyInteraction(semanticScope, presentation);
  const failure = result.error ? classifyTopologyError(result.error) : undefined;
  return {
    state: topologyPageState(request?.query, presentation, interaction.interaction, result.isFetching, failure),
    actions: {
      ...interaction.actions,
      changeScope: (patch: TopologyScopePatch) => {
        updateRouteQuery(params, setParams, query => changeTopologyScope(query, patch));
      },
      changePage: (pageIndex: number, pageSize: number) => {
        updateRouteQuery(params, setParams, query => changeTopologyPage(query, pageIndex, pageSize));
      },
      refresh: () => {
        if (request) void result.refetch();
      }
    }
  };
}

function updateRouteQuery(
  params: URLSearchParams,
  setParams: ReturnType<typeof useSearchParams>[1],
  update: (query: TopologyQuery) => TopologyQuery
) {
  try {
    setParams(writeTopologyQuery(update(parseTopologyQuery(params))));
  } catch {
    // Invalid URL evidence stays visible until the operator corrects the address.
  }
}

function useSettledTopologyGraph(
  semanticScope: string,
  fetched: TopologyPresentation | undefined,
  fetching: boolean,
  error: Error | null
) {
  const [settled, setSettled] = useState<SettledGraph>();
  useEffect(() => {
    if (!fetched || fetching || error) return;
    // TanStack evidence is the external source synchronized into the scope-owned canvas.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettled({ semanticScope, presentation: fetched });
  }, [error, fetched, fetching, semanticScope]);
  return settled?.semanticScope === semanticScope ? settled.presentation : undefined;
}

function resolveTopologyRequest(
  params: URLSearchParams,
  effectiveWindow: ExactTimeWindow | undefined,
  refreshRevision: number
) {
  try {
    const routeQuery = withTopologyPageDefaults(parseTopologyQuery(params));
    const query: TopologyQuery =
      routeQuery.window || !effectiveWindow ? routeQuery : { ...routeQuery, window: effectiveWindow };
    return {
      query,
      key: topologyQueryKeys.graph(query, refreshRevision),
      semanticScope: topologySemanticScope(routeQuery, effectiveWindow)
    };
  } catch {
    return undefined;
  }
}

function topologySemanticScope(routeQuery: TopologyQuery, effectiveWindow: ExactTimeWindow | undefined) {
  const routeScope = writeTopologyQuery(routeQuery).toString();
  const inheritedDuration =
    routeQuery.window || !effectiveWindow ? 'none' : String(effectiveWindow.to - effectiveWindow.from);
  return `${routeScope}|inheritedDuration=${inheritedDuration}`;
}

function topologyPageState(
  query: TopologyQuery | undefined,
  presentation: TopologyPresentation | undefined,
  interaction: TopologyInteraction,
  fetching: boolean,
  failure: TopologyFailure | undefined
): TopologyPageState {
  return {
    ...(query ? { query } : {}),
    evidence: resolveTopologyEvidence(Boolean(query), failure, presentation),
    interaction,
    refreshing: fetching && presentation !== undefined,
    ...(failure && presentation ? { refreshFailure: failure } : {})
  };
}

function resolveTopologyEvidence(
  valid: boolean,
  failure: TopologyFailure | undefined,
  presentation: TopologyPresentation | undefined
): TopologyPageEvidence {
  if (!valid) return { kind: 'contract' };
  if (presentation) {
    const empty = presentation.graph.nodes.length === 0 && presentation.graph.edges.length === 0;
    return { kind: empty ? 'empty' : 'ready', presentation };
  }
  if (failure) return { kind: failure.kind };
  return { kind: 'loading' };
}
