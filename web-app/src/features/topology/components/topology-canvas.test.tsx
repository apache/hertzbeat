/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { externalPresentation, interaction, presentation } from './topology-canvas-test-fixtures';

const runtime = vi.hoisted(() => {
  const instances: MockGraph[] = [];
  let initialScale = 1;
  const Graph = vi.fn(function (options: unknown) {
    const graph = createMockGraph(options);
    instances.push(graph);
    return graph;
  });
  return {
    Graph,
    instances,
    get initialScale() {
      return initialScale;
    },
    set initialScale(value: number) {
      initialScale = value;
    }
  };
});
vi.mock('@antv/g6', () => ({
  CanvasEvent: { CLICK: 'canvas:click' },
  EdgeEvent: { CLICK: 'edge:click', POINTER_LEAVE: 'edge:pointerleave', POINTER_OVER: 'edge:pointerover' },
  Graph: runtime.Graph,
  GraphEvent: { AFTER_TRANSFORM: 'aftertransform' },
  NodeEvent: { CLICK: 'node:click', POINTER_LEAVE: 'node:pointerleave', POINTER_OVER: 'node:pointerover' }
}));
vi.mock('antd', () => ({
  theme: {
    useToken: () => ({
      token: {
        colorBgContainer: '#ffffff',
        colorBorder: '#d9d9d9',
        colorError: '#ff4d4f',
        colorInfo: '#1677ff',
        colorPrimary: '#1677ff',
        colorSuccess: '#52c41a',
        colorText: '#000000',
        colorTextDisabled: '#bfbfbf',
        colorTextQuaternary: '#8c8c8c',
        colorWarning: '#faad14'
      }
    })
  }
}));

import { TopologyCanvas, type TopologyCanvasHandle } from './topology-canvas';

const resize = vi.hoisted(() => ({ observers: [] as MockResizeObserver[] }));

describe('TopologyCanvas runtime lifecycle', () => {
  beforeEach(() => {
    runtime.instances.length = 0;
    runtime.Graph.mockClear();
    runtime.initialScale = 1;
    resize.observers.length = 0;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('updates data and interaction without rebuilding or fitting the stable structure', async () => {
    const view = render(<TopologyCanvas {...props(presentation('structure-a'), interaction())} />);
    const graph = await renderedGraph();
    expect(graph.fitView).toHaveBeenCalledOnce();

    view.rerender(
      <TopologyCanvas {...props(presentation('structure-a', 12), interaction({ kind: 'node', nodeId: 'node-a' }))} />
    );

    await waitFor(() => expect(graph.draw).toHaveBeenCalledTimes(2));
    expect(runtime.Graph).toHaveBeenCalledOnce();
    expect(graph.fitView).toHaveBeenCalledOnce();
    expect(graph.destroy).not.toHaveBeenCalled();
  });

  it('rebuilds structural data and restores the prior viewport without fitting again', async () => {
    const view = render(<TopologyCanvas {...props(presentation('structure-a'), interaction())} />);
    const first = await renderedGraph();
    first.getZoom.mockReturnValue(1.4);
    first.getPosition.mockReturnValue([22, 33]);

    view.rerender(<TopologyCanvas {...props(presentation('structure-b'), interaction())} />);

    await waitFor(() => expect(runtime.Graph).toHaveBeenCalledTimes(2));
    const second = runtime.instances[1];
    if (!second) throw new Error('The replacement graph was not created.');
    await waitFor(() => expect(second.translateTo).toHaveBeenCalledWith([22, 33], false));
    expect(first.destroy).toHaveBeenCalledOnce();
    expect(second.zoomTo).toHaveBeenCalledWith(1.4, false);
    expect(second.fitView).not.toHaveBeenCalled();
  });
});

describe('TopologyCanvas event and resource bridge', () => {
  beforeEach(() => {
    runtime.instances.length = 0;
    runtime.Graph.mockClear();
    runtime.initialScale = 1;
    resize.observers.length = 0;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('bridges graph events, blank selection, resize, fit, and cleanup', async () => {
    const callbacks = eventCallbacks();
    const handle = createRef<TopologyCanvasHandle>();
    const view = render(
      <TopologyCanvas ref={handle} {...props(presentation('structure-a'), interaction(), callbacks)} />
    );
    const graph = await renderedGraph();

    emit(graph, 'node:click', 'node-a');
    emit(graph, 'edge:click', 'edge-a');
    emit(graph, 'node:pointerover', 'node-a');
    emit(graph, 'node:pointerleave', 'node-a');
    emit(graph, 'edge:pointerover', 'edge-a');
    emit(graph, 'edge:pointerleave', 'edge-a');
    emit(graph, 'canvas:click');
    expect(callbacks.onNodeSelect).toHaveBeenCalledWith('node-a');
    expect(callbacks.onEdgeSelect).toHaveBeenCalledWith('edge-a');
    expect(callbacks.onNodeHover).toHaveBeenLastCalledWith(null);
    expect(callbacks.onEdgeHover).toHaveBeenLastCalledWith(null);
    expect(callbacks.onClearSelection).toHaveBeenCalledOnce();

    act(() => resize.observers[0]?.notify(640, 360));
    expect(graph.setSize).toHaveBeenCalledWith(640, 360);
    graph.getZoom.mockClear();
    act(() => handle.current?.fit());
    expect(graph.fitView).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(graph.getZoom).toHaveBeenCalled());
    graph.getZoom.mockReturnValue(0.8);
    emit(graph, 'aftertransform');
    expect(callbacks.onScaleChange).toHaveBeenLastCalledWith(0.8);

    view.unmount();
    expect(resize.observers[0]?.disconnect).toHaveBeenCalledOnce();
    expect(graph.off).toHaveBeenCalledOnce();
    expect(graph.destroy).toHaveBeenCalledOnce();
  });

  it('exposes clamped zoom operations and publishes the exact scale after every graph transform', async () => {
    const callbacks = eventCallbacks();
    const handle = createRef<TopologyCanvasHandle>();
    render(<TopologyCanvas ref={handle} {...props(presentation('structure-a'), interaction(), callbacks)} />);
    const graph = await renderedGraph();

    graph.getZoom.mockReturnValue(1.4);
    emit(graph, 'aftertransform');
    expect(callbacks.onScaleChange).toHaveBeenLastCalledWith(1.4);

    graph.getZoom.mockReturnValue(1.95);
    act(() => handle.current?.zoomIn());
    await waitFor(() => expect(graph.zoomTo).toHaveBeenLastCalledWith(2, false));

    graph.getZoom.mockReturnValue(0.36);
    act(() => handle.current?.zoomOut());
    await waitFor(() => expect(graph.zoomTo).toHaveBeenLastCalledWith(0.35, false));

    graph.zoomTo.mockRejectedValueOnce(new Error('private zoom failure'));
    act(() => handle.current?.zoomIn());
    await waitFor(() => expect(callbacks.onRuntimeStateChange).toHaveBeenLastCalledWith({ kind: 'failure' }));
  });

  it('caps initial and manual fit at 100% while explicit zoom still reaches 200%', async () => {
    runtime.initialScale = 2;
    const callbacks = eventCallbacks();
    const handle = createRef<TopologyCanvasHandle>();
    render(<TopologyCanvas ref={handle} {...props(presentation('structure-a'), interaction(), callbacks)} />);
    const graph = await renderedGraph();

    await waitFor(() => expect(graph.zoomTo).toHaveBeenCalledWith(1, false));
    expect(callbacks.onScaleChange).toHaveBeenLastCalledWith(1);

    graph.getZoom.mockReturnValue(2);
    act(() => handle.current?.fit());
    await waitFor(() => expect(graph.zoomTo).toHaveBeenLastCalledWith(1, false));

    graph.getZoom.mockReturnValue(1.95);
    act(() => handle.current?.zoomIn());
    await waitFor(() => expect(graph.zoomTo).toHaveBeenLastCalledWith(2, false));
  });

  it('publishes scale only after overlapping manual fits have both settled', async () => {
    const firstFit = deferred<void>();
    const secondFit = deferred<void>();
    const callbacks = eventCallbacks();
    const handle = createRef<TopologyCanvasHandle>();
    render(<TopologyCanvas ref={handle} {...props(presentation('structure-a'), interaction(), callbacks)} />);
    const graph = await renderedGraph();
    await waitFor(() => expect(callbacks.onRuntimeStateChange).toHaveBeenLastCalledWith({ kind: 'ready' }));
    graph.fitView.mockClear();
    graph.getZoom.mockClear();
    callbacks.onScaleChange.mockClear();
    graph.fitView.mockImplementationOnce(() => firstFit.promise).mockImplementationOnce(() => secondFit.promise);

    act(() => {
      handle.current?.fit();
      handle.current?.fit();
    });
    emit(graph, 'aftertransform');
    expect(callbacks.onScaleChange).not.toHaveBeenCalled();

    act(() => firstFit.resolve());
    await waitFor(() => expect(graph.getZoom).toHaveBeenCalledOnce());
    emit(graph, 'aftertransform');
    expect(callbacks.onScaleChange).not.toHaveBeenCalled();

    act(() => secondFit.resolve());
    await waitFor(() => expect(callbacks.onScaleChange).toHaveBeenLastCalledWith(1));
  });

  it('maps synthetic external-target events to their edge without faking a node selection', async () => {
    const callbacks = eventCallbacks();
    render(<TopologyCanvas {...props(externalPresentation(), interaction(), callbacks)} />);
    const graph = await renderedGraph();
    const options = graph.options as {
      data?: { nodes?: Array<{ id?: string; data?: { externalTarget?: boolean } }> };
    };
    const externalId = options.data?.nodes?.find(node => node.data?.externalTarget)?.id;
    if (!externalId) throw new Error('The external target was not rendered.');

    emit(graph, 'node:click', externalId);
    emit(graph, 'node:pointerover', externalId);
    emit(graph, 'node:pointerleave', externalId);
    expect(callbacks.onEdgeSelect).toHaveBeenCalledWith('edge-external');
    expect(callbacks.onEdgeHover).toHaveBeenNthCalledWith(1, 'edge-external');
    expect(callbacks.onEdgeHover).toHaveBeenLastCalledWith(null);
    expect(callbacks.onNodeSelect).not.toHaveBeenCalled();
    expect(callbacks.onNodeHover).not.toHaveBeenCalled();

    emit(graph, 'node:click', 'node-a');
    emit(graph, 'node:pointerover', 'node-a');
    emit(graph, 'node:pointerleave', 'node-a');
    expect(callbacks.onNodeSelect).toHaveBeenCalledWith('node-a');
    expect(callbacks.onNodeHover).toHaveBeenNthCalledWith(1, 'node-a');
    expect(callbacks.onNodeHover).toHaveBeenLastCalledWith(null);
  });
});

type EventHandler = (event: { target?: { id?: string } }) => void;
type MockGraph = ReturnType<typeof createMockGraph>;

function createMockGraph(options: unknown) {
  const handlers = new Map<string, EventHandler>();
  let scale = runtime.initialScale;
  return {
    options,
    handlers,
    destroy: vi.fn(),
    draw: vi.fn().mockResolvedValue(undefined),
    fitView: vi.fn().mockResolvedValue(undefined),
    getPosition: vi.fn(() => [0, 0]),
    getZoom: vi.fn(() => scale),
    off: vi.fn(),
    on: vi.fn((event: string, handler: EventHandler) => handlers.set(event, handler)),
    render: vi.fn().mockResolvedValue(undefined),
    setData: vi.fn(),
    setEdge: vi.fn(),
    setNode: vi.fn(),
    setSize: vi.fn(),
    translateTo: vi.fn().mockResolvedValue(undefined),
    zoomTo: vi.fn((nextScale: number) => {
      scale = nextScale;
      return Promise.resolve();
    })
  };
}

class MockResizeObserver {
  disconnect = vi.fn();
  constructor(private readonly callback: ResizeObserverCallback) {
    resize.observers.push(this);
  }
  observe = vi.fn();
  unobserve = vi.fn();
  notify(width: number, height: number) {
    this.callback([{ contentRect: { width, height } } as ResizeObserverEntry], this);
  }
}

async function renderedGraph() {
  await waitFor(() => expect(runtime.instances[0]?.render).toHaveBeenCalledOnce());
  const graph = runtime.instances[0];
  if (!graph) throw new Error('The graph was not created.');
  return graph;
}

function emit(graph: MockGraph, event: string, id?: string) {
  act(() => graph.handlers.get(event)?.(id ? { target: { id } } : {}));
}

function eventCallbacks() {
  return {
    onClearSelection: vi.fn(),
    onEdgeHover: vi.fn(),
    onEdgeSelect: vi.fn(),
    onNodeHover: vi.fn(),
    onNodeSelect: vi.fn(),
    onScaleChange: vi.fn(),
    onRuntimeStateChange: vi.fn()
  };
}

function props(
  value: ReturnType<typeof presentation>,
  current: ReturnType<typeof interaction>,
  callbacks = eventCallbacks()
) {
  return { presentation: value, interaction: current, ...callbacks };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
