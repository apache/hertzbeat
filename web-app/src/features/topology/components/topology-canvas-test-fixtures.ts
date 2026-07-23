/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';

export function interaction(selected: TopologyInteraction['selected'] = { kind: 'none' }): TopologyInteraction {
  return { selected, hover: { kind: 'none' } };
}

export function presentation(
  graphStructureKey: string,
  requestRatePerSecond: number | null = null
): TopologyPresentation {
  return {
    graph: {
      nodes: [
        {
          id: 'node-a',
          entityId: 1,
          entityName: 'checkout',
          entityType: 'service',
          namespace: 'shop',
          environment: 'prod',
          health: 'healthy',
          focus: true,
          evidenceBadges: [],
          redMetrics: {
            requestRatePerSecond,
            requestCount: null,
            errorRate: null,
            errorCount: null,
            latencyP95Ms: null,
            latencyAvgMs: null
          }
        }
      ],
      edges: []
    },
    metricRows: [],
    summary: {
      apiBacked: true,
      focusEntityId: 1,
      depth: 1,
      sourceKinds: [],
      nodeCount: 1,
      edgeCount: 0,
      impactEventCount: 0
    },
    graphStructureKey
  };
}
