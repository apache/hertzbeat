/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { interaction, presentation } from './topology-canvas-test-fixtures';

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
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorText: '#000000',
    colorTextDisabled: '#bfbfbf',
    colorTextQuaternary: '#8c8c8c',
    colorWarning: '#faad14'
  }
}));

vi.mock('@antv/g6', () => ({
  CanvasEvent: { CLICK: 'canvas:click' },
  EdgeEvent: { CLICK: 'edge:click', POINTER_LEAVE: 'edge:pointerleave', POINTER_OVER: 'edge:pointerover' },
  Graph: runtime.Graph,
  GraphEvent: { AFTER_TRANSFORM: 'aftertransform' },
  NodeEvent: { CLICK: 'node:click', POINTER_LEAVE: 'node:pointerleave', POINTER_OVER: 'node:pointerover' }
}));
vi.mock('antd', () => ({ theme: { useToken: () => ({ token: antTheme.token }) } }));

import { TopologyCanvas } from './topology-canvas';
import { useTopologyInteraction } from '../controller/use-topology-interaction';

beforeEach(() => {
  runtime.instances.length = 0;
  runtime.Graph.mockClear();
  runtime.renderResult = undefined;
  resize.observers.length = 0;
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TopologyCanvas runtime evidence and palette', () => {
  it('does not redraw a stable selected interaction after a runtime-ready parent rerender', async () => {
    const view = render(<InteractionRuntimeHarness runtimeReady={false} />);
    const graph = await renderedGraph();
    await waitFor(() => expect(graph.draw).toHaveBeenCalledOnce());
    graph.draw.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'select node' }));
    await waitFor(() => expect(graph.draw).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toHaveTextContent('node-a');
    graph.draw.mockClear();

    view.rerender(<InteractionRuntimeHarness runtimeReady />);

    expect(screen.getByText('ready')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('node-a');
    expect(graph.draw).not.toHaveBeenCalled();
  });

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

  it('serializes rapid updates and applies the latest input after a pending draw', async () => {
    const pending = deferred<void>();
    const view = render(<TopologyCanvas {...props('structure-a')} />);
    const graph = await renderedGraph();
    await waitFor(() => expect(graph.draw).toHaveBeenCalledOnce());
    graph.draw.mockClear();
    graph.setData.mockClear();
    graph.draw.mockImplementationOnce(() => pending.promise).mockResolvedValue(undefined);

    view.rerender(<TopologyCanvas {...props('structure-a', 1)} />);
    await waitFor(() => expect(graph.draw).toHaveBeenCalledOnce());
    view.rerender(<TopologyCanvas {...props('structure-a', 2)} />);

    expect(graph.draw).toHaveBeenCalledOnce();
    expect(graph.setData.mock.lastCall?.[0]).toMatchObject({
      nodes: [{ data: { metrics: { requestRatePerSecond: 1 } } }]
    });

    act(() => pending.resolve());
    await waitFor(() => expect(graph.draw).toHaveBeenCalledTimes(2));
    expect(graph.setData.mock.lastCall?.[0]).toMatchObject({
      nodes: [{ data: { metrics: { requestRatePerSecond: 2 } } }]
    });
  });
});

describe('TopologyCanvas bootstrap lifecycle', () => {
  it('updates G6 options from Ant tokens without rebuilding or fitting', async () => {
    const view = render(<TopologyCanvas {...props('structure-a')} />);
    const graph = await renderedGraph();
    antTheme.token = { ...antTheme.token, colorPrimary: '#5b21b6', colorText: '#e8edf5' };
    view.rerender(<TopologyCanvas {...props('structure-a')} />);

    await waitFor(() => expect(graph.setNode).toHaveBeenCalled());
    expect(graph.setNode.mock.lastCall?.[0]).toMatchObject({
      state: { selected: { stroke: '#5b21b6' } }
    });
    expect(decodeURIComponent(String(graph.setData.mock.lastCall?.[0]?.nodes?.[0]?.style?.iconSrc))).toContain(
      'stroke="#e8edf5"'
    );
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

  it('subscribes to viewport transforms only after initialization and then publishes the initialized scale', async () => {
    const pending = deferred<void>();
    const callbacks = eventCallbacks();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    runtime.renderResult = pending.promise;
    render(<TopologyCanvas {...props('structure-a', null, callbacks)} />);
    const graph = await renderedGraph();
    graph.getZoom.mockImplementation(() => {
      if (runtime.renderResult) throw new Error('viewport is not initialized');
      return 0.75;
    });

    expect(graph.handlers.has('aftertransform')).toBe(false);
    act(() => graph.handlers.get('aftertransform')?.());
    expect(graph.getZoom).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    pending.resolve();
    runtime.renderResult = undefined;

    await waitFor(() => expect(callbacks.onRuntimeStateChange).toHaveBeenLastCalledWith({ kind: 'ready' }));
    expect(graph.handlers.has('aftertransform')).toBe(true);
    expect(callbacks.onScaleChange).toHaveBeenLastCalledWith(0.75);
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
  const handlers = new Map<string, () => void>();
  return {
    handlers,
    destroy: vi.fn(),
    draw: vi.fn().mockResolvedValue(undefined),
    fitView: vi.fn().mockResolvedValue(undefined),
    getPosition: vi.fn(() => [0, 0]),
    getZoom: vi.fn(() => 1),
    off: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => handlers.set(event, handler)),
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
    onRuntimeStateChange: vi.fn(),
    onScaleChange: vi.fn()
  };
}

const stablePresentation = presentation('stable-structure');

function InteractionRuntimeHarness({ runtimeReady }: { runtimeReady: boolean }) {
  const { interaction: current, actions } = useTopologyInteraction('stable-scope', stablePresentation);
  return (
    <>
      <button type="button" onClick={() => actions.selectNode('node-a')}>
        select node
      </button>
      <span>{runtimeReady ? 'ready' : 'loading'}</span>
      <output role="status">{current.selected.kind === 'node' ? current.selected.nodeId : 'none'}</output>
      <TopologyCanvas
        presentation={stablePresentation}
        interaction={current}
        onClearSelection={actions.clearSelection}
        onEdgeHover={edgeId => (edgeId ? actions.hoverEdge(edgeId) : actions.clearHover())}
        onEdgeSelect={actions.selectEdge}
        onNodeHover={nodeId => (nodeId ? actions.hoverNode(nodeId) : actions.clearHover())}
        onNodeSelect={actions.selectNode}
        onRuntimeStateChange={() => undefined}
        onScaleChange={() => undefined}
      />
    </>
  );
}
