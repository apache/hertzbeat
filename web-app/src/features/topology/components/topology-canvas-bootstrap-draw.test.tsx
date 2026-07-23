/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { interaction, presentation } from './topology-canvas-test-fixtures';

const runtime = vi.hoisted(() => {
  const instances: MockGraph[] = [];
  let drawResult: Promise<void> | undefined;
  const Graph = vi.fn(function () {
    const graph = createMockGraph(drawResult);
    instances.push(graph);
    return graph;
  });
  return {
    Graph,
    instances,
    set drawResult(value: Promise<void> | undefined) {
      drawResult = value;
    }
  };
});

vi.mock('@antv/g6', () => ({
  CanvasEvent: { CLICK: 'canvas:click' },
  EdgeEvent: { CLICK: 'edge:click', POINTER_LEAVE: 'edge:pointerleave', POINTER_OVER: 'edge:pointerover' },
  Graph: runtime.Graph,
  NodeEvent: { CLICK: 'node:click', POINTER_LEAVE: 'node:pointerleave', POINTER_OVER: 'node:pointerover' }
}));
vi.mock('antd', () => ({
  theme: {
    useToken: () => ({
      token: {
        colorBgContainer: '#ffffff',
        colorBorder: '#d9d9d9',
        colorInfo: '#1677ff',
        colorPrimary: '#1677ff',
        colorText: '#000000'
      }
    })
  }
}));

import { TopologyCanvas } from './topology-canvas';

afterEach(() => {
  cleanup();
  runtime.instances.length = 0;
  runtime.drawResult = undefined;
  vi.unstubAllGlobals();
});

it('serially catches up input changes that arrive during the bootstrap draw', async () => {
  const pendingDraw = deferred<void>();
  const callbacks = eventCallbacks();
  runtime.drawResult = pendingDraw.promise;
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  const view = render(<TopologyCanvas {...props(null, callbacks)} />);
  const graph = await bootstrappingGraph();

  view.rerender(<TopologyCanvas {...props(11, callbacks)} />);
  expect(graph.draw).toHaveBeenCalledOnce();
  expect(callbacks.onRuntimeStateChange).not.toHaveBeenLastCalledWith({ kind: 'ready' });

  pendingDraw.resolve();
  await waitFor(() => expect(callbacks.onRuntimeStateChange).toHaveBeenLastCalledWith({ kind: 'ready' }));
  expect(graph.draw).toHaveBeenCalledTimes(2);
  expect(graph.setData.mock.lastCall?.[0]).toMatchObject({
    nodes: [{ data: { metrics: { requestRatePerSecond: 11 } } }]
  });
});

type MockGraph = ReturnType<typeof createMockGraph>;

function createMockGraph(firstDraw: Promise<void> | undefined) {
  let drawCount = 0;
  return {
    destroy: vi.fn(),
    draw: vi.fn(() => (drawCount++ === 0 && firstDraw ? firstDraw : Promise.resolve())),
    fitView: vi.fn().mockResolvedValue(undefined),
    getPosition: vi.fn(() => [0, 0]),
    getZoom: vi.fn(() => 1),
    off: vi.fn(),
    on: vi.fn(),
    render: vi.fn().mockResolvedValue(undefined),
    setData: vi.fn(),
    setEdge: vi.fn(),
    setNode: vi.fn(),
    setSize: vi.fn(),
    translateTo: vi.fn().mockResolvedValue(undefined),
    zoomTo: vi.fn().mockResolvedValue(undefined)
  };
}

class MockResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

async function bootstrappingGraph() {
  await waitFor(() => expect(runtime.instances[0]?.draw).toHaveBeenCalledOnce());
  const graph = runtime.instances[0];
  if (!graph) throw new Error('The graph was not created.');
  return graph;
}

function props(requestRate: number | null, callbacks: ReturnType<typeof eventCallbacks>) {
  return { presentation: presentation('structure-a', requestRate), interaction: interaction(), ...callbacks };
}

function eventCallbacks() {
  return {
    onClearSelection: vi.fn(),
    onEdgeHover: vi.fn(),
    onEdgeSelect: vi.fn(),
    onNodeHover: vi.fn(),
    onNodeSelect: vi.fn(),
    onRuntimeStateChange: vi.fn()
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
