/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { theme } from 'antd';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import { useTopologyG6Runtime, type TopologyRuntimeState } from '../runtime/use-topology-g6-runtime';

import styles from './topology-canvas.module.css';

export type TopologyCanvasHandle = { fit: () => void };
export type TopologyCanvasRuntimeState = TopologyRuntimeState;
export type TopologyCanvasProps = {
  presentation: TopologyPresentation;
  interaction: TopologyInteraction;
  onClearSelection: () => void;
  onEdgeHover: (edgeId: string | null) => void;
  onEdgeSelect: (edgeId: string) => void;
  onNodeHover: (nodeId: string | null) => void;
  onNodeSelect: (nodeId: string) => void;
  onRuntimeStateChange: (state: TopologyCanvasRuntimeState) => void;
};

export const TopologyCanvas = forwardRef<TopologyCanvasHandle, TopologyCanvasProps>(function TopologyCanvas(
  { presentation, interaction, ...callbacks },
  ref
) {
  const host = useRef<HTMLDivElement>(null);
  const { token } = theme.useToken();
  const palette = useMemo(
    () => ({
      border: token.colorBorder,
      hover: token.colorInfo,
      nodeFill: token.colorBgContainer,
      selected: token.colorPrimary,
      text: token.colorText
    }),
    [token.colorBgContainer, token.colorBorder, token.colorInfo, token.colorPrimary, token.colorText]
  );
  const fit = useTopologyG6Runtime(host, { presentation, interaction, palette, callbacks });
  useImperativeHandle(ref, () => ({ fit }), [fit]);
  return <div ref={host} className={styles.topologyCanvas} />;
});
