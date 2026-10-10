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

import { act, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import type { TopologyInteraction, TopologyPresentation } from '../model/topology-view-model';

const delayed = vi.hoisted(() => {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise<unknown>(done => {
    resolve = done;
  });
  return { Graph: vi.fn(), promise, resolve };
});

vi.mock('@/platform/topology', () => delayed.promise);

import { TopologyCanvas } from './topology-canvas';

afterEach(() => vi.unstubAllGlobals());

it('does not create a graph when the dynamic import settles after unmount', async () => {
  vi.stubGlobal('ResizeObserver', vi.fn());
  const view = render(<TopologyCanvas {...props()} />);
  view.unmount();

  await act(async () => {
    delayed.resolve({
      CanvasEvent: { CLICK: 'canvas:click' },
      EdgeEvent: {},
      Graph: delayed.Graph,
      NodeEvent: {}
    });
    await delayed.promise;
  });

  expect(delayed.Graph).not.toHaveBeenCalled();
});

function props() {
  const interaction: TopologyInteraction = { selected: { kind: 'none' }, hover: { kind: 'none' } };
  const presentation: TopologyPresentation = {
    graph: { nodes: [], edges: [] },
    metricRows: [],
    summary: {
      apiBacked: true,
      focusEntityId: null,
      depth: 1,
      partial: false,
      partialReasons: [],
      edgePage: { pageIndex: 0, pageSize: 25, totalElements: 0, hasNext: false },
      sourceKinds: [],
      nodeCount: 0,
      edgeCount: 0,
      impactEventCount: 0
    },
    graphStructureKey: 'empty'
  };
  return {
    interaction,
    presentation,
    onClearSelection: vi.fn(),
    onEdgeHover: vi.fn(),
    onEdgeSelect: vi.fn(),
    onNodeHover: vi.fn(),
    onNodeSelect: vi.fn(),
    onRuntimeStateChange: vi.fn(),
    onScaleChange: vi.fn()
  };
}
