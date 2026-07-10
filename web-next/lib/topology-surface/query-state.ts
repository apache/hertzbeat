import { createCompatSearchParamReader } from '../compat/search-params';
import { readSignalRouteContext } from '../signal-route-context';
import type { TopologyRouteContext } from './view-model';

export type TopologySearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function readTopologyRouteContext(searchParams: TopologySearchParams = {}): TopologyRouteContext {
  const signalContext = readSignalRouteContext(createCompatSearchParamReader(searchParams));
  return {
    ...signalContext,
    entityId: signalContext.entityId ?? firstParam(searchParams.focusEntityId),
    depth: firstParam(searchParams.depth),
    relationType: firstParam(searchParams.relationType),
    hideInternal: firstParam(searchParams.hideInternal),
    pageIndex: firstParam(searchParams.pageIndex),
    pageSize: firstParam(searchParams.pageSize),
    viewMode: firstParam(searchParams.viewMode),
    sourceKind: firstParam(searchParams.sourceKind),
    groupBy: firstParam(searchParams.groupBy),
    scaleProof: firstParam(searchParams.scaleProof),
    search: firstParam(searchParams.search),
    edgeId: firstParam(searchParams.edgeId),
    topologyTargetId: firstParam(searchParams.topologyTargetId),
    topologyTargetName: firstParam(searchParams.topologyTargetName)
  };
}
