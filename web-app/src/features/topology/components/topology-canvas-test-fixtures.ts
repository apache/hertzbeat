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
      partial: false,
      partialReasons: [],
      edgePage: { pageIndex: 0, pageSize: 25, totalElements: 0, hasNext: false },
      sourceKinds: [],
      nodeCount: 1,
      edgeCount: 0,
      impactEventCount: 0
    },
    graphStructureKey
  };
}

export function externalPresentation(): TopologyPresentation {
  const base = presentation('external-structure');
  const node = base.graph.nodes[0];
  if (!node) throw new Error('The topology fixture requires a source node.');
  return {
    ...base,
    graph: {
      nodes: [
        node,
        {
          ...node,
          id: 'external-target:edge-external',
          entityId: 2,
          entityName: 'collision'
        }
      ],
      edges: [
        {
          id: 'edge-external',
          relationId: null,
          sourceNodeId: node.id,
          targetNodeId: null,
          sourceEntityId: node.entityId,
          targetEntityId: null,
          targetRef: 'payments.example',
          sampleTraceId: null,
          sampleSpanId: null,
          firstSeen: null,
          lastSeen: null,
          relationType: 'calls',
          relationSource: 'trace',
          status: 'active',
          score: null,
          evidenceBadges: [],
          redMetrics: node.redMetrics
        }
      ]
    },
    summary: { ...base.summary, nodeCount: 2, edgeCount: 1 }
  };
}
