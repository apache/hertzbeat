/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useRef, useState } from 'react';

import { useSharedTimeOptional } from '@/shared/time';
import { TopologyPageView } from '../components/topology-page-view';
import { type TopologyCanvasHandle, type TopologyCanvasRuntimeState } from '../components/topology-canvas';
import { useTopologyPageController } from '../controller/use-topology-page-controller';

export function TopologyPage() {
  const time = useSharedTimeOptional();
  const controller = useTopologyPageController({
    ...(time?.window ? { effectiveWindow: time.window } : {}),
    refreshRevision: time?.refreshRevision ?? 0
  });
  const canvasRef = useRef<TopologyCanvasHandle>(null);
  const [runtimeState, setRuntimeState] = useState<TopologyCanvasRuntimeState>({ kind: 'loading' });
  const [scale, setScale] = useState(1);
  const { interaction, ...state } = controller.state;
  const refresh = time?.manualRefreshOwner === 'time_revision' ? time.requestRefresh : controller.actions.refresh;
  return (
    <TopologyPageView
      state={state}
      actions={controller.actions}
      interaction={interaction}
      canvasRef={canvasRef}
      runtimeState={runtimeState}
      onRuntimeStateChange={setRuntimeState}
      scale={scale}
      onFit={() => canvasRef.current?.fit()}
      onScaleChange={setScale}
      onZoomIn={() => canvasRef.current?.zoomIn()}
      onZoomOut={() => canvasRef.current?.zoomOut()}
      onRefresh={refresh}
    />
  );
}
