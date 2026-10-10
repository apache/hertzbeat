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
