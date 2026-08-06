/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useMemo, useState } from 'react';

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
import type { TopologyRouteSelection } from '../model/topology-model';

type ScopedHover = { scope: string; value: TopologyInteraction['hover'] };

export function useTopologyInteraction(
  scope: string,
  presentation: TopologyPresentation | undefined,
  routeSelection: TopologyRouteSelection,
  onSelectionChange: (selection: TopologyRouteSelection) => void
) {
  const [stored, setStored] = useState<ScopedHover>(() => ({
    scope,
    value: emptyTopologyInteraction().hover
  }));
  const selectionId = topologySelectionId(routeSelection);
  const interaction = useMemo(
    () => visibleInteraction(stored, scope, presentation, selectionFromIdentity(routeSelection.kind, selectionId)),
    [presentation, routeSelection.kind, scope, selectionId, stored]
  );
  useEffect(() => {
    const value = interaction.hover;
    if (stored.scope === scope && sameTopologyTarget(stored.value, value)) return;
    // Scope and graph evidence permanently retire stale hover IDs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored({ scope, value });
  }, [interaction.hover, scope, stored.scope, stored.value]);
  useEffect(() => {
    if (!presentation || sameTopologyTarget(routeSelection, interaction.selected)) return;
    onSelectionChange(interaction.selected);
  }, [interaction.selected, onSelectionChange, presentation, routeSelection]);

  const update = (change: (current: TopologyInteraction) => TopologyInteraction) => {
    if (!presentation) return;
    const next = reconcileTopologyInteraction(change(interaction), presentation);
    setStored({ scope, value: next.hover });
    if (!sameTopologyTarget(next.selected, interaction.selected)) onSelectionChange(next.selected);
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

function visibleInteraction(
  stored: ScopedHover,
  scope: string,
  presentation: TopologyPresentation | undefined,
  routeSelection: TopologyRouteSelection
) {
  if (stored.scope !== scope || !presentation) return emptyTopologyInteraction();
  return reconcileTopologyInteraction({ selected: routeSelection, hover: stored.value }, presentation);
}

function selectionFromIdentity(kind: TopologyRouteSelection['kind'], id: string): TopologyRouteSelection {
  if (kind === 'node') return { kind, nodeId: id };
  if (kind === 'edge') return { kind, edgeId: id };
  return { kind: 'none' };
}

function topologySelectionId(selection: TopologyRouteSelection) {
  if (selection.kind === 'node') return selection.nodeId;
  if (selection.kind === 'edge') return selection.edgeId;
  return '';
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
