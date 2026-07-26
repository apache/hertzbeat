/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { RefObject } from 'react';

import type { TopologyPageActions, TopologyPageState } from '../model/topology-page-contract';
import type { TopologyPresentation } from '../model/topology-view-model';
import { TopologyCanvas, type TopologyCanvasHandle, type TopologyCanvasRuntimeState } from './topology-canvas';
import { TopologyCanvasControls } from './topology-canvas-controls';
import { TopologyCanvasLegend } from './topology-canvas-legend';
import { TopologyMetricTable } from './topology-metric-table';
import { TopologyToolbar } from './topology-toolbar';
import styles from './topology-page.module.css';

type Props = {
  state: Omit<TopologyPageState, 'interaction'>;
  actions: TopologyPageActions;
  interaction: TopologyPageState['interaction'];
  canvasRef?: RefObject<TopologyCanvasHandle | null>;
  presentation: TopologyPresentation;
  scale: number;
  onFit: () => void;
  onRefresh: () => void;
  onRuntimeStateChange: (state: TopologyCanvasRuntimeState) => void;
  onScaleChange: (scale: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function TopologyGraphColumn({
  state,
  actions,
  interaction,
  canvasRef,
  presentation,
  scale,
  onFit,
  onRefresh,
  onRuntimeStateChange,
  onScaleChange,
  onZoomIn,
  onZoomOut
}: Props) {
  return (
    <main className={styles.graphColumn}>
      <div className={styles.canvasFrame}>
        <TopologyCanvas
          ref={canvasRef}
          presentation={presentation}
          interaction={interaction}
          onClearSelection={actions.clearSelection}
          onEdgeHover={edgeId => (edgeId ? actions.hoverEdge(edgeId) : actions.clearHover())}
          onEdgeSelect={actions.selectEdge}
          onNodeHover={nodeId => (nodeId ? actions.hoverNode(nodeId) : actions.clearHover())}
          onNodeSelect={actions.selectNode}
          onRuntimeStateChange={onRuntimeStateChange}
          onScaleChange={onScaleChange}
        />
        {state.query ? <TopologyToolbar query={state.query} changeScope={actions.changeScope} /> : null}
        <TopologyCanvasControls
          scale={scale}
          refreshing={state.refreshing}
          onFit={onFit}
          onRefresh={onRefresh}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
        />
        <TopologyCanvasLegend presentation={presentation} />
      </div>
      <TopologyMetricTable
        rows={presentation.metricRows}
        interaction={interaction}
        edgePage={presentation.summary.edgePage}
        actions={actions}
      />
    </main>
  );
}
