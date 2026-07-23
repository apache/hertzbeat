/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TopologyG6Graph, TopologyG6GraphRef, TopologyG6InputRef } from './topology-g6-runtime-contract';

export type TopologyViewport = { zoom: number; position: [number, number] };
export type ScaleSuppressions = WeakMap<TopologyG6Graph, number>;

export function fitTopologyGraph(
  graphRef: TopologyG6GraphRef,
  input: TopologyG6InputRef,
  suppressions: ScaleSuppressions
) {
  const graph = graphRef.current;
  if (!graph) return;
  suppressScaleEvents(suppressions, graph);
  void fitWithinMaxScale(graph)
    .then(() => settleFit(graphRef, input, suppressions, graph))
    .catch(() => failFit(graphRef, input, suppressions, graph));
}

export function zoomTopologyGraph(graphRef: TopologyG6GraphRef, input: TopologyG6InputRef, factor: number) {
  const graph = graphRef.current;
  if (!graph) return;
  const current = graph.getZoom();
  if (!Number.isFinite(current)) {
    publishState(input, 'failure');
    return;
  }
  void graph
    .zoomTo(clampScale(current * factor), false)
    .then(() => {
      if (graphRef.current === graph) publishState(input, 'ready');
    })
    .catch(() => {
      if (graphRef.current === graph) publishState(input, 'failure');
    });
}

export function publishTopologyScale(graph: TopologyG6Graph, input: TopologyG6InputRef) {
  const scale = graph.getZoom();
  if (Number.isFinite(scale)) input.current.callbacks.onScaleChange(scale);
}

export function scaleEventsSuppressed(suppressions: ScaleSuppressions, graph: TopologyG6Graph) {
  return suppressions.has(graph);
}

export function readTopologyViewport(graph: TopologyG6Graph): TopologyViewport | undefined {
  const zoom = graph.getZoom();
  const position = graph.getPosition();
  const x = position[0];
  const y = position[1];
  if (typeof x !== 'number' || typeof y !== 'number' || ![zoom, x, y].every(Number.isFinite)) return undefined;
  return { zoom: clampScale(zoom), position: [x, y] };
}

export async function restoreOrFitTopologyGraph(graph: TopologyG6Graph, viewport: TopologyViewport | undefined) {
  if (!viewport) {
    await fitWithinMaxScale(graph);
    return;
  }
  await graph.zoomTo(viewport.zoom, false);
  await graph.translateTo(viewport.position, false);
}

async function fitWithinMaxScale(graph: TopologyG6Graph) {
  await graph.fitView({ direction: 'both', when: 'always' }, false);
  const scale = graph.getZoom();
  if (!Number.isFinite(scale)) throw new Error('Invalid graph scale after fit.');
  if (scale > 1) await graph.zoomTo(1, false);
}

function settleFit(
  graphRef: TopologyG6GraphRef,
  input: TopologyG6InputRef,
  suppressions: ScaleSuppressions,
  graph: TopologyG6Graph
) {
  const settled = releaseScaleEvents(suppressions, graph);
  if (graphRef.current === graph && settled) {
    publishTopologyScale(graph, input);
    publishState(input, 'ready');
  }
}

function failFit(
  graphRef: TopologyG6GraphRef,
  input: TopologyG6InputRef,
  suppressions: ScaleSuppressions,
  graph: TopologyG6Graph
) {
  releaseScaleEvents(suppressions, graph);
  if (graphRef.current === graph) publishState(input, 'failure');
}

function clampScale(scale: number) {
  return Math.min(2, Math.max(0.35, scale));
}

function suppressScaleEvents(suppressions: ScaleSuppressions, graph: TopologyG6Graph) {
  suppressions.set(graph, (suppressions.get(graph) ?? 0) + 1);
}

function releaseScaleEvents(suppressions: ScaleSuppressions, graph: TopologyG6Graph) {
  const remaining = (suppressions.get(graph) ?? 1) - 1;
  if (remaining > 0) {
    suppressions.set(graph, remaining);
    return false;
  }
  suppressions.delete(graph);
  return true;
}

function publishState(input: TopologyG6InputRef, kind: 'ready' | 'failure') {
  input.current.callbacks.onRuntimeStateChange({ kind });
}
