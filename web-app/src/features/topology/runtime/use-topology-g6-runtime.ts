/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { useTopologyGraphUpdates } from './topology-g6-draw-runtime';
import {
  commitCandidateGraph,
  createPendingResources,
  disposeGraph,
  initializeCandidateGraph,
  ownsActiveResources,
  retainPendingResources,
  retirePendingResources,
  type GraphResources,
  type RuntimeRefs
} from './topology-g6-lifecycle';
import type {
  TopologyG6Graph,
  TopologyG6InputRef,
  TopologyG6RuntimeInput,
  TopologyRuntimeState
} from './topology-g6-runtime-contract';
import {
  fitTopologyGraph,
  zoomTopologyGraph,
  type ScaleSuppressions,
  type TopologyViewport
} from './topology-g6-viewport';

export type { TopologyRuntimeState } from './topology-g6-runtime-contract';

export function useTopologyG6Runtime(host: RefObject<HTMLDivElement | null>, input: TopologyG6RuntimeInput) {
  const graphRef = useRef<TopologyG6Graph | undefined>(undefined);
  const activeInputRef = useRef<TopologyG6InputRef | undefined>(undefined);
  const activeResourcesRef = useRef<GraphResources | undefined>(undefined);
  const activeStructureKeyRef = useRef<string | undefined>(undefined);
  const pendingResourcesRef = useRef<GraphResources | undefined>(undefined);
  const viewportRef = useRef<TopologyViewport | undefined>(undefined);
  const suppressedScaleEventsRef = useRef<ScaleSuppressions>(new WeakMap());
  const inputRef = useRef(input);
  const refs: RuntimeRefs = {
    activeInput: activeInputRef,
    activeResources: activeResourcesRef,
    activeStructureKey: activeStructureKeyRef,
    graph: graphRef,
    pendingResources: pendingResourcesRef,
    scaleSuppressions: suppressedScaleEventsRef,
    viewport: viewportRef
  };
  useEffect(() => {
    inputRef.current = input;
    const structureKey = input.presentation.graphStructureKey;
    if (activeStructureKeyRef.current === structureKey && activeInputRef.current) {
      activeInputRef.current.current = input;
    }
    const pending = pendingResourcesRef.current;
    if (pending?.structureKey === structureKey) pending.input.current = input;
  }, [input, activeInputRef, activeStructureKeyRef, pendingResourcesRef]);
  useTopologyBootstrap(host, refs, inputRef, input.presentation.graphStructureKey);
  useTopologyGraphUpdates(graphRef, activeStructureKeyRef, activeInputRef, input);
  useEffect(
    () => () => {
      const active = activeResourcesRef.current;
      const pending = pendingResourcesRef.current;
      if (pending && pending !== active) disposeGraph(pending, graphRef, viewportRef, false);
      if (active) disposeGraph(active, graphRef, viewportRef, true);
      activeInputRef.current = undefined;
      activeResourcesRef.current = undefined;
      activeStructureKeyRef.current = undefined;
      pendingResourcesRef.current = undefined;
    },
    [activeInputRef, activeResourcesRef, activeStructureKeyRef, graphRef, pendingResourcesRef, viewportRef]
  );
  const fit = useCallback(() => {
    const activeInput = activeInputRef.current;
    if (activeInput) fitTopologyGraph(graphRef, activeInput, suppressedScaleEventsRef.current);
  }, []);
  const zoomIn = useCallback(() => {
    const activeInput = activeInputRef.current;
    if (activeInput) zoomTopologyGraph(graphRef, activeInput, 1.2);
  }, []);
  const zoomOut = useCallback(() => {
    const activeInput = activeInputRef.current;
    if (activeInput) zoomTopologyGraph(graphRef, activeInput, 1 / 1.2);
  }, []);
  return { fit, zoomIn, zoomOut };
}

function useTopologyBootstrap(
  host: RefObject<HTMLDivElement | null>,
  refs: RuntimeRefs,
  inputRef: TopologyG6InputRef,
  structureKey: string
) {
  const { activeInput, activeResources, activeStructureKey, graph, pendingResources, scaleSuppressions, viewport } =
    refs;
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    const runtimeRefs = {
      activeInput,
      activeResources,
      activeStructureKey,
      graph,
      pendingResources,
      scaleSuppressions,
      viewport
    };
    const resources = createPendingResources(inputRef, structureKey);
    retainPendingResources(runtimeRefs, resources);
    publishState(inputRef, 'loading');
    // Keep G6 inside the mounted runtime so route chunks do not evaluate it before a canvas is requested.
    void import('@antv/g6')
      .then(async module => {
        const candidate = await initializeCandidateGraph(module, container, resources, runtimeRefs, () => cancelled);
        if (candidate) commitCandidateGraph(candidate, resources, runtimeRefs);
      })
      .catch(() => {
        if (cancelled || ownsActiveResources(runtimeRefs, resources)) return;
        disposeGraph(resources, graph, viewport, false);
        retirePendingResources(runtimeRefs, resources);
        publishState(inputRef, 'failure');
      });
    return () => {
      cancelled = true;
      retirePendingResources(runtimeRefs, resources);
      if (!ownsActiveResources(runtimeRefs, resources)) disposeGraph(resources, graph, viewport, false);
    };
  }, [
    activeInput,
    activeResources,
    activeStructureKey,
    graph,
    host,
    inputRef,
    pendingResources,
    scaleSuppressions,
    structureKey,
    viewport
  ]);
}

function publishState(input: TopologyG6InputRef, kind: TopologyRuntimeState['kind']) {
  input.current.callbacks.onRuntimeStateChange({ kind });
}
