/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { scopedQueryKey } from '@/shared/query-context';

import { parseTopologyQuery, writeTopologyQuery, type TopologyQuery } from '../model/topology-model';

const topologyRootKey = ['topology'] as const;

export const topologyQueryKeys = {
  graph: (query: TopologyQuery, refreshRevision = 0) => {
    const canonical = parseTopologyQuery(writeTopologyQuery(query));
    return [
      ...scopedQueryKey(topologyRootKey, { environment: canonical.environment }, canonical.window, refreshRevision),
      {
        focusEntityId: canonical.focusEntityId,
        depth: canonical.depth,
        sourceKind: canonical.sourceKind,
        relationType: canonical.relationType,
        hideInternal: canonical.hideInternal,
        pageIndex: canonical.pageIndex,
        pageSize: canonical.pageSize
      }
    ] as const;
  }
};
