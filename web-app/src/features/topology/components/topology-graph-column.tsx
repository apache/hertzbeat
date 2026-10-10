/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
          ref={canvasRef as RefObject<TopologyCanvasHandle> | undefined}
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
