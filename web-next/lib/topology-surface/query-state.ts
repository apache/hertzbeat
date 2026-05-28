import { createCompatSearchParamReader } from '../compat/search-params';
import { readSignalRouteContext } from '../signal-route-context';
import type { TopologyRouteContext } from './view-model';

export type TopologySearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function readTopologyRouteContext(searchParams: TopologySearchParams = {}): TopologyRouteContext {
  return {
    ...readSignalRouteContext(createCompatSearchParamReader(searchParams)),
    depth: firstParam(searchParams.depth),
    relationType: firstParam(searchParams.relationType),
    hideInternal: firstParam(searchParams.hideInternal),
    pageIndex: firstParam(searchParams.pageIndex),
    pageSize: firstParam(searchParams.pageSize),
    viewMode: firstParam(searchParams.viewMode),
    sourceKind: firstParam(searchParams.sourceKind),
    groupBy: firstParam(searchParams.groupBy),
    edgeId: firstParam(searchParams.edgeId)
  };
}
