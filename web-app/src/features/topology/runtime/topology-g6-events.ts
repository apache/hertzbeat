/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { topologyG6ExternalEdgeId } from './topology-g6-data';
import type { TopologyG6Graph, TopologyG6InputRef, TopologyG6Module } from './topology-g6-runtime-contract';
import { publishTopologyScale, scaleEventsSuppressed, type ScaleSuppressions } from './topology-g6-viewport';

export function bindTopologyInteractionEvents(
  graph: TopologyG6Graph,
  module: TopologyG6Module,
  input: TopologyG6InputRef
) {
  graph.on(module.NodeEvent.CLICK, event =>
    routeNodeEvent(event, input, input.current.callbacks.onNodeSelect, input.current.callbacks.onEdgeSelect)
  );
  graph.on(module.EdgeEvent.CLICK, event => withEventId(event, input.current.callbacks.onEdgeSelect));
  graph.on(module.NodeEvent.POINTER_OVER, event =>
    routeNodeEvent(event, input, input.current.callbacks.onNodeHover, input.current.callbacks.onEdgeHover)
  );
  graph.on(module.NodeEvent.POINTER_LEAVE, event => {
    const routed = routeNodeEvent(
      event,
      input,
      () => input.current.callbacks.onNodeHover(null),
      () => input.current.callbacks.onEdgeHover(null)
    );
    if (!routed) input.current.callbacks.onNodeHover(null);
  });
  graph.on(module.EdgeEvent.POINTER_OVER, event => withEventId(event, input.current.callbacks.onEdgeHover));
  graph.on(module.EdgeEvent.POINTER_LEAVE, () => input.current.callbacks.onEdgeHover(null));
  graph.on(module.CanvasEvent.CLICK, () => input.current.callbacks.onClearSelection());
}

export function bindTopologyViewportEvents(
  graph: TopologyG6Graph,
  module: TopologyG6Module,
  input: TopologyG6InputRef,
  suppressions: ScaleSuppressions
) {
  graph.on(module.GraphEvent.AFTER_TRANSFORM, () => {
    if (!scaleEventsSuppressed(suppressions, graph)) publishTopologyScale(graph, input);
  });
}

function routeNodeEvent(
  event: unknown,
  input: TopologyG6InputRef,
  onNode: (id: string) => void,
  onExternalEdge: (id: string) => void
) {
  const id = eventId(event);
  if (id === undefined) return false;
  const edgeId = topologyG6ExternalEdgeId(input.current.presentation, id);
  if (edgeId !== undefined) onExternalEdge(edgeId);
  else onNode(id);
  return true;
}

function withEventId(event: unknown, callback: (id: string) => void) {
  const id = eventId(event);
  if (id !== undefined) callback(id);
}

function eventId(event: unknown) {
  if (!event || typeof event !== 'object' || !('target' in event)) return;
  const target = event.target;
  return target && typeof target === 'object' && 'id' in target && typeof target.id === 'string'
    ? target.id
    : undefined;
}
