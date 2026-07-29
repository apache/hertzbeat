/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef } from 'react';

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import { topologyG6Data } from './topology-g6-data';
import { topologyG6ElementOptions, type TopologyG6Palette } from './topology-g6-options';
import type {
  TopologyG6Graph,
  TopologyG6GraphRef,
  TopologyG6InputRef,
  TopologyG6RuntimeInput
} from './topology-g6-runtime-contract';

type DrawInput = Pick<TopologyG6RuntimeInput, 'presentation' | 'interaction' | 'palette'>;
type DrawDrain = { running: boolean; pending: DrawInput | undefined };

export function useTopologyGraphUpdates(
  graphRef: TopologyG6GraphRef,
  activeStructureKeyRef: React.MutableRefObject<string | undefined>,
  activeInputRef: React.MutableRefObject<TopologyG6InputRef | undefined>,
  input: TopologyG6RuntimeInput
) {
  const drainsRef = useRef(new WeakMap<TopologyG6Graph, DrawDrain>());
  const { interaction, palette, presentation } = input;
  useEffect(() => {
    const graph = graphRef.current;
    const graphInput = activeInputRef.current;
    if (!graph || !graphInput || activeStructureKeyRef.current !== presentation.graphStructureKey) return;
    queueGraphInput(graph, { interaction, palette, presentation }, graphRef, graphInput, drainsRef.current);
  }, [activeInputRef, activeStructureKeyRef, graphRef, interaction, palette, presentation]);
}

export async function reconcileBootstrapInput(
  graph: TopologyG6Graph,
  input: TopologyG6InputRef,
  cancelled: () => boolean
) {
  let snapshot: TopologyG6RuntimeInput;
  do {
    snapshot = input.current;
    await drawGraphInput(graph, snapshot.presentation, snapshot.interaction, snapshot.palette);
  } while (!cancelled() && snapshot !== input.current);
}

function queueGraphInput(
  graph: TopologyG6Graph,
  input: DrawInput,
  graphRef: TopologyG6GraphRef,
  inputRef: TopologyG6InputRef,
  drains: WeakMap<TopologyG6Graph, DrawDrain>
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
  graph: TopologyG6Graph,
  drain: DrawDrain,
  graphRef: TopologyG6GraphRef,
  inputRef: TopologyG6InputRef
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
  graph: TopologyG6Graph,
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

function publishState(input: TopologyG6InputRef, kind: 'ready' | 'failure') {
  input.current.callbacks.onRuntimeStateChange({ kind });
}
