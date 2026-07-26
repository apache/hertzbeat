/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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

vi.mock('@antv/g6', () => delayed.promise);

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
