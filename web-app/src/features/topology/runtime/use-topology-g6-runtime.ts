/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { topologyG6Options } from './topology-g6-adapter';
import { reconcileBootstrapInput, useTopologyGraphUpdates } from './topology-g6-draw-runtime';
import { bindTopologyInteractionEvents, bindTopologyViewportEvents } from './topology-g6-events';
import type {
  TopologyG6Graph,
  TopologyG6GraphRef,
  TopologyG6InputRef,
  TopologyG6Module,
  TopologyG6RuntimeInput,
  TopologyRuntimeState
} from './topology-g6-runtime-contract';
import {
  fitTopologyGraph,
  publishTopologyScale,
  readTopologyViewport,
  restoreOrFitTopologyGraph,
  zoomTopologyGraph,
  type ScaleSuppressions,
  type TopologyViewport
} from './topology-g6-viewport';

type GraphResources = {
  disposed: boolean;
  graph: TopologyG6Graph | undefined;
  observer: ResizeObserver | undefined;
};

export type { TopologyRuntimeState } from './topology-g6-runtime-contract';

export function useTopologyG6Runtime(host: RefObject<HTMLDivElement | null>, input: TopologyG6RuntimeInput) {
  const graphRef = useRef<TopologyG6Graph | undefined>(undefined);
  const viewportRef = useRef<TopologyViewport | undefined>(undefined);
  const suppressedScaleEventsRef = useRef<ScaleSuppressions>(new WeakMap());
  const inputRef = useRef(input);
  useEffect(() => {
    inputRef.current = input;
  }, [input]);
  useTopologyBootstrap(
    host,
    graphRef,
    viewportRef,
    suppressedScaleEventsRef,
    inputRef,
    input.presentation.graphStructureKey
  );
  useTopologyGraphUpdates(graphRef, inputRef, input);
  const fit = useCallback(() => fitTopologyGraph(graphRef, inputRef, suppressedScaleEventsRef.current), []);
  const zoomIn = useCallback(() => zoomTopologyGraph(graphRef, inputRef, 1.2), []);
  const zoomOut = useCallback(() => zoomTopologyGraph(graphRef, inputRef, 1 / 1.2), []);
  return { fit, zoomIn, zoomOut };
}

function useTopologyBootstrap(
  host: RefObject<HTMLDivElement | null>,
  graphRef: TopologyG6GraphRef,
  viewportRef: React.MutableRefObject<TopologyViewport | undefined>,
  suppressedScaleEventsRef: React.MutableRefObject<ScaleSuppressions>,
  inputRef: TopologyG6InputRef,
  structureKey: string
) {
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    const resources: GraphResources = { disposed: false, graph: undefined, observer: undefined };
    publishState(inputRef, 'loading');
    // Keep G6 inside the mounted runtime so route chunks do not evaluate it before a canvas is requested.
    void import('@antv/g6')
      .then(async module => {
        if (cancelled) return;
        const graph = createGraph(module, container, inputRef.current);
        resources.graph = graph;
        bindTopologyInteractionEvents(graph, module, inputRef);
        resources.observer = observeSize(container, graph);
        await graph.render();
        if (cancelled) return;
        await restoreOrFitTopologyGraph(graph, viewportRef.current);
        if (cancelled) return;
        await reconcileBootstrapInput(graph, inputRef, () => cancelled);
        if (cancelled) return;
        graphRef.current = graph;
        viewportRef.current = undefined;
        bindTopologyViewportEvents(graph, module, inputRef, suppressedScaleEventsRef.current);
        publishTopologyScale(graph, inputRef);
        publishState(inputRef, 'ready');
      })
      .catch(() => {
        if (cancelled) return;
        disposeGraph(resources, graphRef, viewportRef, false);
        publishState(inputRef, 'failure');
      });
    return () => {
      cancelled = true;
      disposeGraph(resources, graphRef, viewportRef, true);
    };
  }, [graphRef, host, inputRef, structureKey, suppressedScaleEventsRef, viewportRef]);
}

function disposeGraph(
  resources: GraphResources,
  graphRef: TopologyG6GraphRef,
  viewportRef: React.MutableRefObject<TopologyViewport | undefined>,
  rememberViewport: boolean
) {
  if (resources.disposed) return;
  resources.disposed = true;
  resources.observer?.disconnect();
  const graph = resources.graph;
  if (!graph) return;
  if (rememberViewport && graphRef.current === graph) viewportRef.current = readTopologyViewport(graph);
  graph.off();
  graph.destroy();
  if (graphRef.current === graph) graphRef.current = undefined;
}

function createGraph(module: TopologyG6Module, container: HTMLDivElement, input: TopologyG6RuntimeInput) {
  return new module.Graph({ container, ...topologyG6Options(input.presentation, input.interaction, input.palette) });
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

function publishState(input: TopologyG6InputRef, kind: TopologyRuntimeState['kind']) {
  input.current.callbacks.onRuntimeStateChange({ kind });
}
