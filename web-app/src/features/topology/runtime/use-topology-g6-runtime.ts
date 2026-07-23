/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useEffect, useRef, type RefObject } from 'react';

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import {
  topologyG6Data,
  topologyG6ElementOptions,
  topologyG6ExternalEdgeId,
  topologyG6Options,
  type TopologyG6Palette
} from './topology-g6-adapter';
type G6Module = typeof import('@antv/g6');
type G6Graph = InstanceType<G6Module['Graph']>;
type Viewport = { zoom: number; position: [number, number] };
type GraphResources = { disposed: boolean; graph: G6Graph | undefined; observer: ResizeObserver | undefined };
export type TopologyRuntimeState = { kind: 'loading' | 'ready' | 'failure' };
type RuntimeCallbacks = {
  onClearSelection: () => void;
  onEdgeHover: (edgeId: string | null) => void;
  onEdgeSelect: (edgeId: string) => void;
  onNodeHover: (nodeId: string | null) => void;
  onNodeSelect: (nodeId: string) => void;
  onRuntimeStateChange: (state: TopologyRuntimeState) => void;
  onScaleChange: (scale: number) => void;
};
type RuntimeInput = {
  presentation: TopologyPresentation;
  interaction: TopologyInteraction;
  palette: TopologyG6Palette;
  callbacks: RuntimeCallbacks;
};
type DrawInput = Pick<RuntimeInput, 'presentation' | 'interaction' | 'palette'>;
type DrawDrain = { running: boolean; pending: DrawInput | undefined };
export function useTopologyG6Runtime(host: RefObject<HTMLDivElement | null>, input: RuntimeInput) {
  const graphRef = useRef<G6Graph | undefined>(undefined);
  const viewportRef = useRef<Viewport | undefined>(undefined);
  const inputRef = useRef(input);
  useEffect(() => {
    inputRef.current = input;
  }, [input]);
  useTopologyBootstrap(host, graphRef, viewportRef, inputRef, input.presentation.graphStructureKey);
  useTopologyGraphUpdates(graphRef, inputRef, input);
  const fit = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    void graph
      .fitView({ direction: 'both', when: 'always' }, false)
      .then(() => {
        if (graphRef.current === graph) publishState(inputRef, 'ready');
      })
      .catch(() => {
        if (graphRef.current === graph) publishState(inputRef, 'failure');
      });
  }, []);
  const zoomIn = useCallback(() => zoomGraph(graphRef, inputRef, 1.2), []);
  const zoomOut = useCallback(() => zoomGraph(graphRef, inputRef, 1 / 1.2), []);
  return { fit, zoomIn, zoomOut };
}
function useTopologyBootstrap(
  host: RefObject<HTMLDivElement | null>,
  graphRef: React.MutableRefObject<G6Graph | undefined>,
  viewportRef: React.MutableRefObject<Viewport | undefined>,
  inputRef: React.MutableRefObject<RuntimeInput>,
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
        bindEvents(graph, module, inputRef);
        resources.observer = observeSize(container, graph);
        await graph.render();
        if (cancelled) return;
        await restoreOrFit(graph, viewportRef.current);
        if (cancelled) return;
        await reconcileBootstrapInput(graph, inputRef, () => cancelled);
        if (cancelled) return;
        graphRef.current = graph;
        viewportRef.current = undefined;
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
  }, [graphRef, host, inputRef, structureKey, viewportRef]);
}
function useTopologyGraphUpdates(
  graphRef: React.MutableRefObject<G6Graph | undefined>,
  inputRef: React.MutableRefObject<RuntimeInput>,
  input: RuntimeInput
) {
  const drainsRef = useRef(new WeakMap<G6Graph, DrawDrain>());
  const { interaction, palette, presentation } = input;
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    queueGraphInput(graph, { interaction, palette, presentation }, graphRef, inputRef, drainsRef.current);
  }, [graphRef, inputRef, interaction, palette, presentation]);
}
function queueGraphInput(
  graph: G6Graph,
  input: DrawInput,
  graphRef: React.MutableRefObject<G6Graph | undefined>,
  inputRef: React.MutableRefObject<RuntimeInput>,
  drains: WeakMap<G6Graph, DrawDrain>
) {
  const drain = drains.get(graph) ?? { running: false, pending: undefined };
  drains.set(graph, drain);
  // G6 draws are serialized per graph; replacing pending input coalesces bursts to the latest snapshot.
  drain.pending = input;
  if (drain.running) return;
  drain.running = true;
  void drainGraphInputs(graph, drain, graphRef, inputRef);
}
async function drainGraphInputs(
  graph: G6Graph,
  drain: DrawDrain,
  graphRef: React.MutableRefObject<G6Graph | undefined>,
  inputRef: React.MutableRefObject<RuntimeInput>
) {
  while (graphRef.current === graph && drain.pending) {
    const next = drain.pending;
    drain.pending = undefined;
    try {
      await drawGraphInput(graph, next.presentation, next.interaction, next.palette);
      if (graphRef.current === graph && !drain.pending) publishState(inputRef, 'ready');
    } catch {
      if (graphRef.current === graph && !drain.pending) publishState(inputRef, 'failure');
    }
  }
  drain.running = false;
  if (graphRef.current !== graph) drain.pending = undefined;
}
async function drawGraphInput(
  graph: G6Graph,
  presentation: TopologyPresentation,
  interaction: TopologyInteraction,
  palette: TopologyG6Palette
) {
  const elements = topologyG6ElementOptions(palette);
  graph.setNode(elements.node);
  graph.setEdge(elements.edge);
  graph.setData(topologyG6Data(presentation, interaction, palette));
  await graph.draw();
}
async function reconcileBootstrapInput(
  graph: G6Graph,
  input: React.MutableRefObject<RuntimeInput>,
  cancelled: () => boolean
) {
  let snapshot: RuntimeInput;
  do {
    snapshot = input.current;
    await drawGraphInput(graph, snapshot.presentation, snapshot.interaction, snapshot.palette);
  } while (!cancelled() && snapshot !== input.current);
}
function disposeGraph(
  resources: GraphResources,
  graphRef: React.MutableRefObject<G6Graph | undefined>,
  viewportRef: React.MutableRefObject<Viewport | undefined>,
  rememberViewport: boolean
) {
  if (resources.disposed) return;
  resources.disposed = true;
  resources.observer?.disconnect();
  const graph = resources.graph;
  if (!graph) return;
  if (rememberViewport && graphRef.current === graph) viewportRef.current = readViewport(graph);
  graph.off();
  graph.destroy();
  if (graphRef.current === graph) graphRef.current = undefined;
}
function createGraph(module: G6Module, container: HTMLDivElement, input: RuntimeInput) {
  return new module.Graph({ container, ...topologyG6Options(input.presentation, input.interaction, input.palette) });
}
function bindEvents(graph: G6Graph, module: G6Module, input: React.MutableRefObject<RuntimeInput>) {
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
  graph.on(module.GraphEvent.AFTER_TRANSFORM, () => publishScale(graph, input));
}
function routeNodeEvent(
  event: unknown,
  input: React.MutableRefObject<RuntimeInput>,
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
function publishState(input: React.MutableRefObject<RuntimeInput>, kind: TopologyRuntimeState['kind']) {
  input.current.callbacks.onRuntimeStateChange({ kind });
}
function publishScale(graph: G6Graph, input: React.MutableRefObject<RuntimeInput>) {
  const scale = graph.getZoom();
  if (Number.isFinite(scale)) input.current.callbacks.onScaleChange(scale);
}
function zoomGraph(
  graphRef: React.MutableRefObject<G6Graph | undefined>,
  input: React.MutableRefObject<RuntimeInput>,
  factor: number
) {
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
function clampScale(scale: number) {
  return Math.min(2, Math.max(0.35, scale));
}
function observeSize(container: HTMLDivElement, graph: G6Graph) {
  if (typeof ResizeObserver === 'undefined') return undefined;
  const observer = new ResizeObserver(entries => {
    const { width, height } = entries[0]?.contentRect ?? {};
    if (width && height) graph.setSize(width, height);
  });
  observer.observe(container);
  return observer;
}
function readViewport(graph: G6Graph): Viewport | undefined {
  const zoom = graph.getZoom();
  const position = graph.getPosition();
  const x = position[0];
  const y = position[1];
  if (typeof x !== 'number' || typeof y !== 'number' || ![zoom, x, y].every(Number.isFinite)) return undefined;
  return { zoom: clampScale(zoom), position: [x, y] };
}
async function restoreOrFit(graph: G6Graph, viewport: Viewport | undefined) {
  if (!viewport) {
    await graph.fitView({ direction: 'both', when: 'always' }, false);
    return;
  }
  await graph.zoomTo(viewport.zoom, false);
  await graph.translateTo(viewport.position, false);
}
