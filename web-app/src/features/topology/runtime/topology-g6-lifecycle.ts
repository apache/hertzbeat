/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { MutableRefObject } from 'react';

import { topologyG6Options } from './topology-g6-adapter';
import { reconcileBootstrapInput } from './topology-g6-draw-runtime';
import { bindTopologyInteractionEvents, bindTopologyViewportEvents } from './topology-g6-events';
import type {
  TopologyG6Graph,
  TopologyG6GraphRef,
  TopologyG6InputRef,
  TopologyG6Module
} from './topology-g6-runtime-contract';
import {
  readTopologyViewport,
  restoreOrFitTopologyGraph,
  type ScaleSuppressions,
  type TopologyViewport
} from './topology-g6-viewport';

export type GraphResources = {
  disposed: boolean;
  graph: TopologyG6Graph | undefined;
  input: TopologyG6InputRef;
  layer: HTMLDivElement | undefined;
  observer: ResizeObserver | undefined;
  structureKey: string;
};

export type RuntimeRefs = {
  activeInput: MutableRefObject<TopologyG6InputRef | undefined>;
  activeResources: MutableRefObject<GraphResources | undefined>;
  activeStructureKey: MutableRefObject<string | undefined>;
  graph: TopologyG6GraphRef;
  pendingResources: MutableRefObject<GraphResources | undefined>;
  scaleSuppressions: MutableRefObject<ScaleSuppressions>;
  viewport: MutableRefObject<TopologyViewport | undefined>;
};

export type CandidateGraph = {
  graph: TopologyG6Graph;
  initializedScale: number;
  layer: HTMLDivElement;
};

export function createPendingResources(input: TopologyG6InputRef, structureKey: string): GraphResources {
  return {
    disposed: false,
    graph: undefined,
    input: { current: input.current },
    layer: undefined,
    observer: undefined,
    structureKey
  };
}

export async function initializeCandidateGraph(
  module: TopologyG6Module,
  container: HTMLDivElement,
  resources: GraphResources,
  refs: RuntimeRefs,
  cancelled: () => boolean
): Promise<CandidateGraph | undefined> {
  if (cancelled()) return;
  const layer = createGraphLayer(container);
  resources.layer = layer;
  const graph = new module.Graph({
    container: layer,
    ...topologyG6Options(
      resources.input.current.presentation,
      resources.input.current.interaction,
      resources.input.current.palette
    )
  });
  resources.graph = graph;
  const ownsGraph = () => refs.graph.current === graph;
  bindTopologyInteractionEvents(graph, module, resources.input, ownsGraph);
  resources.observer = observeSize(container, graph);
  await graph.render();
  if (cancelled()) return;
  const previousViewport = refs.graph.current ? readTopologyViewport(refs.graph.current) : refs.viewport.current;
  await restoreOrFitTopologyGraph(graph, previousViewport);
  if (cancelled()) return;
  await reconcileBootstrapInput(graph, resources.input, cancelled);
  if (cancelled()) return;
  bindTopologyViewportEvents(graph, module, resources.input, refs.scaleSuppressions.current, ownsGraph);
  const initializedScale = graph.getZoom();
  if (!Number.isFinite(initializedScale)) throw new Error('Invalid initialized graph scale.');
  return { graph, initializedScale, layer };
}

export function commitCandidateGraph(candidate: CandidateGraph, resources: GraphResources, refs: RuntimeRefs) {
  // Keep the active layer visible until the candidate has rendered, restored its viewport, and reconciled.
  const previousResources = refs.activeResources.current;
  refs.graph.current = candidate.graph;
  refs.activeInput.current = resources.input;
  refs.activeResources.current = resources;
  refs.activeStructureKey.current = resources.structureKey;
  if (refs.pendingResources.current === resources) refs.pendingResources.current = undefined;
  refs.viewport.current = undefined;
  activateGraphLayer(candidate.layer);
  if (previousResources && previousResources !== resources) {
    disposeGraph(previousResources, refs.graph, refs.viewport, false);
  }
  resources.input.current.callbacks.onScaleChange(candidate.initializedScale);
  resources.input.current.callbacks.onRuntimeStateChange({ kind: 'ready' });
}

export function disposeGraph(
  resources: GraphResources,
  graphRef: TopologyG6GraphRef,
  viewportRef: MutableRefObject<TopologyViewport | undefined>,
  rememberViewport: boolean
) {
  if (resources.disposed) return;
  resources.disposed = true;
  resources.observer?.disconnect();
  const graph = resources.graph;
  if (graph) {
    if (rememberViewport && graphRef.current === graph) viewportRef.current = readTopologyViewport(graph);
    graph.off();
    graph.destroy();
    if (graphRef.current === graph) graphRef.current = undefined;
  }
  resources.layer?.remove();
}

function createGraphLayer(container: HTMLDivElement) {
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    inset: '0',
    pointerEvents: 'none',
    position: 'absolute',
    visibility: 'hidden'
  });
  container.append(layer);
  return layer;
}

function activateGraphLayer(layer: HTMLDivElement) {
  layer.removeAttribute('aria-hidden');
  layer.style.pointerEvents = 'auto';
  layer.style.visibility = 'visible';
}

function observeSize(container: HTMLDivElement, graph: TopologyG6Graph) {
  if (typeof ResizeObserver === 'undefined') return undefined;
  const observer = new ResizeObserver(entries => {
    const { width, height } = entries[0]?.contentRect ?? {};
    if (width && height) graph.setSize(width, height);
  });
  observer.observe(container);
  return observer;
}
