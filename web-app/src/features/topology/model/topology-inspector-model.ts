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

import type { TopologyEdge, TopologyNode } from './topology-contract';
import type { TopologyInteraction, TopologyPresentation } from './topology-view-model';

export type TopologyInspectorRelation = {
  edge: TopologyEdge;
  counterpart: TopologyNode | undefined;
  externalTarget: string | undefined;
};

export type TopologyInspectorSelection =
  | {
      kind: 'node';
      node: TopologyNode;
      upstream: TopologyInspectorRelation[];
      downstream: TopologyInspectorRelation[];
    }
  | {
      kind: 'edge';
      edge: TopologyEdge;
      source: TopologyNode | undefined;
      target: TopologyNode | undefined;
      externalTarget: string | undefined;
    };

export function resolveTopologyInspectorSelection(
  selected: TopologyInteraction['selected'],
  presentation: TopologyPresentation
): TopologyInspectorSelection | undefined {
  const nodes = new Map(presentation.graph.nodes.map(node => [node.id, node]));
  if (selected.kind === 'node') {
    const node = nodes.get(selected.nodeId);
    if (!node) return undefined;
    return {
      kind: 'node',
      node,
      upstream: presentation.graph.edges
        .filter(edge => edge.targetNodeId === node.id)
        .map(edge => relation(edge, nodes.get(edge.sourceNodeId))),
      downstream: presentation.graph.edges
        .filter(edge => edge.sourceNodeId === node.id)
        .map(edge => relation(edge, edge.targetNodeId ? nodes.get(edge.targetNodeId) : undefined))
    };
  }
  if (selected.kind !== 'edge') return undefined;
  const edge = presentation.graph.edges.find(candidate => candidate.id === selected.edgeId);
  if (!edge) return undefined;
  return {
    kind: 'edge',
    edge,
    source: nodes.get(edge.sourceNodeId),
    target: edge.targetNodeId ? nodes.get(edge.targetNodeId) : undefined,
    externalTarget: edge.targetNodeId ? undefined : (edge.targetRef ?? undefined)
  };
}

function relation(edge: TopologyEdge, counterpart: TopologyNode | undefined): TopologyInspectorRelation {
  return {
    edge,
    counterpart,
    externalTarget: counterpart || edge.targetNodeId ? undefined : (edge.targetRef ?? undefined)
  };
}
