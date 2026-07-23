/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { MutableRefObject } from 'react';

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import type { TopologyG6Palette } from './topology-g6-options';

export type TopologyG6Module = typeof import('@antv/g6');
export type TopologyG6Graph = InstanceType<TopologyG6Module['Graph']>;
export type TopologyG6GraphRef = MutableRefObject<TopologyG6Graph | undefined>;
export type TopologyG6InputRef = MutableRefObject<TopologyG6RuntimeInput>;
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

export type TopologyG6RuntimeInput = {
  presentation: TopologyPresentation;
  interaction: TopologyInteraction;
  palette: TopologyG6Palette;
  callbacks: RuntimeCallbacks;
};
