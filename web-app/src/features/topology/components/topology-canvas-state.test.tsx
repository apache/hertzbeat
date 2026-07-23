/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { interaction, presentation } from './topology-canvas.test-fixtures';

const runtime = vi.hoisted(() => {
  const instances: MockGraph[] = [];
  let renderResult: Promise<void> | undefined;
  const Graph = vi.fn(function () {
    const graph = createMockGraph(renderResult);
    instances.push(graph);
    return graph;
  });
  return {
    Graph,
    instances,
    get renderResult() {
      return renderResult;
    },
    set renderResult(value: Promise<void> | undefined) {
      renderResult = value;
    }
  };
});
const resize = vi.hoisted(() => ({ observers: [] as MockResizeObserver[] }));
const antTheme = vi.hoisted(() => ({
  token: {
    colorBgContainer: '#ffffff',
    colorBorder: '#d9d9d9',
    colorInfo: '#1677ff',
    colorPrimary: '#1677ff',
    colorText: '#000000'
  }
}));

vi.mock('@antv/g6', () => ({
  CanvasEvent: { CLICK: 'canvas:click' },
  EdgeEvent: { CLICK: 'edge:click', POINTER_LEAVE: 'edge:pointerleave', POINTER_OVER: 'edge:pointerover' },
  Graph: runtime.Graph,
  NodeEvent: { CLICK: 'node:click', POINTER_LEAVE: 'node:pointerleave', POINTER_OVER: 'node:pointerover' }
}));
vi.mock('antd', () => ({ theme: { useToken: () => ({ token: antTheme.token }) } }));

import { TopologyCanvas } from './topology-canvas';

beforeEach(() => {
  runtime.instances.length = 0;
  runtime.Graph.mockClear();
  runtime.renderResult = undefined;
  resize.observers.length = 0;
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TopologyCanvas runtime evidence and palette', () => {
  it('publishes only safe failure evidence and recovers after a later draw succeeds', async () => {
    const callbacks = eventCallbacks();
    const view = render(<TopologyCanvas {...props('structure-a', null, callbacks)} />);
    const graph = await renderedGraph();
    await waitFor(() => expect(callbacks.onRuntimeStateChange).toHaveBeenLastCalledWith({ kind: 'ready' }));

    graph.draw.mockRejectedValueOnce(new Error('private renderer detail'));
    view.rerender(<TopologyCanvas {...props('structure-a', 1, callbacks)} />);
    await waitFor(() => expect(callbacks.onRuntimeStateChange).toHaveBeenLastCalledWith({ kind: 'failure' }));
    expect(JSON.stringify(callbacks.onRuntimeStateChange.mock.calls)).not.toContain('private renderer detail');

    view.rerender(<TopologyCanvas {...props('structure-a', 2, callbacks)} />);
    await waitFor(() => expect(callbacks.onRuntimeStateChange).toHaveBeenLastCalledWith({ kind: 'ready' }));
    expect(runtime.Graph).toHaveBeenCalledOnce();
    expect(graph.fitView).toHaveBeenCalledOnce();
  });
});

describe('TopologyCanvas bootstrap lifecycle', () => {
  it('updates G6 options from Ant tokens without rebuilding or fitting', async () => {
    const view = render(<TopologyCanvas {...props('structure-a')} />);
    const graph = await renderedGraph();
    antTheme.token = { ...antTheme.token, colorPrimary: '#5b21b6' };
    view.rerender(<TopologyCanvas {...props('structure-a')} />);

    await waitFor(() => expect(graph.setNode).toHaveBeenCalled());
    expect(graph.setNode.mock.lastCall?.[0]).toMatchObject({
      state: { selected: { stroke: '#5b21b6' } }
    });
    expect(runtime.Graph).toHaveBeenCalledOnce();
    expect(graph.fitView).toHaveBeenCalledOnce();
  });

  it('keeps bootstrap private and reconciles the latest input before ready', async () => {
    const pending = deferred<void>();
    const callbacks = eventCallbacks();
    runtime.renderResult = pending.promise;
    const view = render(<TopologyCanvas {...props('structure-a', null, callbacks)} />);
    const graph = await renderedGraph();

    view.rerender(<TopologyCanvas {...props('structure-a', 9, callbacks)} />);
    expect(graph.setData).not.toHaveBeenCalled();
    expect(graph.draw).not.toHaveBeenCalled();

    pending.resolve();
    await waitFor(() => expect(callbacks.onRuntimeStateChange).toHaveBeenLastCalledWith({ kind: 'ready' }));
    expect(graph.setData.mock.lastCall?.[0]).toMatchObject({
      nodes: [{ data: { metrics: { requestRatePerSecond: 9 } } }]
    });
    expect(graph.draw).toHaveBeenCalledOnce();
  });

  it('disposes a rejected bootstrap once and publishes only safe failure evidence', async () => {
    const pending = deferred<void>();
    const callbacks = eventCallbacks();
    runtime.renderResult = pending.promise;
    const view = render(<TopologyCanvas {...props('structure-a', null, callbacks)} />);
    const graph = await renderedGraph();

    pending.reject(new Error('private bootstrap detail'));
    await waitFor(() => expect(callbacks.onRuntimeStateChange).toHaveBeenLastCalledWith({ kind: 'failure' }));
    expect(JSON.stringify(callbacks.onRuntimeStateChange.mock.calls)).not.toContain('private bootstrap detail');
    expect(resize.observers[0]?.disconnect).toHaveBeenCalledOnce();
    expect(graph.off).toHaveBeenCalledOnce();
    expect(graph.destroy).toHaveBeenCalledOnce();

    view.unmount();
    expect(resize.observers[0]?.disconnect).toHaveBeenCalledOnce();
    expect(graph.off).toHaveBeenCalledOnce();
    expect(graph.destroy).toHaveBeenCalledOnce();
  });
});

type MockGraph = ReturnType<typeof createMockGraph>;

function createMockGraph(renderResult: Promise<void> | undefined) {
  return {
    destroy: vi.fn(),
    draw: vi.fn().mockResolvedValue(undefined),
    fitView: vi.fn().mockResolvedValue(undefined),
    getPosition: vi.fn(() => [0, 0]),
    getZoom: vi.fn(() => 1),
    off: vi.fn(),
    on: vi.fn(),
    render: vi.fn(() => renderResult ?? Promise.resolve()),
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
  constructor() {
    resize.observers.push(this);
  }
  observe = vi.fn();
  unobserve = vi.fn();
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}

async function renderedGraph() {
  await waitFor(() => expect(runtime.instances[0]?.render).toHaveBeenCalledOnce());
  const graph = runtime.instances[0];
  if (!graph) throw new Error('The graph was not created.');
  return graph;
}

function props(structureKey: string, requestRate: number | null = null, callbacks = eventCallbacks()) {
  return { presentation: presentation(structureKey, requestRate), interaction: interaction(), ...callbacks };
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
