/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useState } from 'react';

import {
  clearTopologyHover,
  clearTopologySelection,
  drilldownTopologyRow,
  emptyTopologyInteraction,
  hoverTopologyEdge,
  hoverTopologyNode,
  reconcileTopologyInteraction,
  selectTopologyEdge,
  selectTopologyNode,
  type TopologyInteraction,
  type TopologyMetricRow,
  type TopologyPresentation
} from '../model/topology-view-model';

type ScopedInteraction = { scope: string; value: TopologyInteraction };

export function useTopologyInteraction(scope: string, presentation: TopologyPresentation | undefined) {
  const [stored, setStored] = useState<ScopedInteraction>(() => ({
    scope,
    value: emptyTopologyInteraction()
  }));
  const interaction = visibleInteraction(stored, scope, presentation);
  useEffect(() => {
    const value =
      stored.scope === scope && presentation
        ? reconcileTopologyInteraction(stored.value, presentation)
        : emptyTopologyInteraction();
    if (stored.scope === scope && sameTopologyInteraction(stored.value, value)) return;
    // Scope and graph evidence permanently retire stale interaction IDs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored({ scope, value });
  }, [presentation, scope, stored.scope, stored.value]);

  const update = (change: (current: TopologyInteraction) => TopologyInteraction) => {
    if (!presentation) return;
    setStored(current => ({
      scope,
      value: reconcileTopologyInteraction(change(visibleInteraction(current, scope, presentation)), presentation)
    }));
  };
  return {
    interaction,
    actions: {
      selectNode: (nodeId: string) => update(current => selectTopologyNode(current, nodeId)),
      selectEdge: (edgeId: string) => update(current => selectTopologyEdge(current, edgeId)),
      clearSelection: () => update(clearTopologySelection),
      hoverNode: (nodeId: string) => update(current => hoverTopologyNode(current, nodeId)),
      hoverEdge: (edgeId: string) => update(current => hoverTopologyEdge(current, edgeId)),
      clearHover: () => update(clearTopologyHover),
      drilldown: (row: TopologyMetricRow) => update(current => drilldownTopologyRow(current, row))
    }
  };
}

function visibleInteraction(stored: ScopedInteraction, scope: string, presentation: TopologyPresentation | undefined) {
  if (stored.scope !== scope || !presentation) return emptyTopologyInteraction();
  return reconcileTopologyInteraction(stored.value, presentation);
}

function sameTopologyInteraction(left: TopologyInteraction, right: TopologyInteraction) {
  return sameTopologyTarget(left.selected, right.selected) && sameTopologyTarget(left.hover, right.hover);
}

function sameTopologyTarget(
  left: TopologyInteraction['selected'] | TopologyInteraction['hover'],
  right: TopologyInteraction['selected'] | TopologyInteraction['hover']
) {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'node' && right.kind === 'node') return left.nodeId === right.nodeId;
  if (left.kind === 'edge' && right.kind === 'edge') return left.edgeId === right.edgeId;
  return true;
}
