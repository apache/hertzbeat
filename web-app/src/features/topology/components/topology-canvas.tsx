/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { theme } from 'antd';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';
import { useTopologyG6Runtime, type TopologyRuntimeState } from '../runtime/use-topology-g6-runtime';

import styles from './topology-canvas.module.css';

export type TopologyCanvasHandle = { fit: () => void; zoomIn: () => void; zoomOut: () => void };
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
  onScaleChange: (scale: number) => void;
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
      critical: token.colorError,
      dimmed: token.colorTextDisabled,
      hover: token.colorInfo,
      neutral: token.colorTextQuaternary,
      nodeFill: token.colorBgContainer,
      selected: token.colorPrimary,
      success: token.colorSuccess,
      text: token.colorText,
      warning: token.colorWarning
    }),
    [
      token.colorBgContainer,
      token.colorBorder,
      token.colorError,
      token.colorInfo,
      token.colorPrimary,
      token.colorSuccess,
      token.colorText,
      token.colorTextDisabled,
      token.colorTextQuaternary,
      token.colorWarning
    ]
  );
  const viewport = useTopologyG6Runtime(host, { presentation, interaction, palette, callbacks });
  useImperativeHandle(ref, () => viewport, [viewport]);
  return <div ref={host} className={styles.topologyCanvas} />;
});
