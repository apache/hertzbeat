/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { TopologyGraph } from '../model/topology-contract';
import type { TopologyCanvasProps, TopologyCanvasRuntimeState } from './topology-canvas';
import {
  buildTopologyPresentation,
  clearTopologySelection,
  clearTopologyHover,
  drilldownTopologyRow,
  emptyTopologyInteraction,
  hoverTopologyEdge,
  hoverTopologyNode,
  selectTopologyEdge,
  selectTopologyNode
} from '../model/topology-view-model';
import { TopologyPageView, type TopologyPageViewProps } from './topology-page-view';
import { useCompactTopologyInspector } from './use-compact-topology-inspector';

const canvasBoundary = vi.hoisted(() => ({ fit: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn() }));
vi.mock('./topology-canvas', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    TopologyCanvas: forwardRef(function CanvasBoundary(props: TopologyCanvasProps, ref) {
      useImperativeHandle(ref, () => canvasBoundary);
      return (
        <div data-testid="topology-canvas" data-interaction={JSON.stringify(props.interaction)}>
          <button onClick={() => props.onNodeSelect('node-1')}>canvas node</button>
          <button onClick={() => props.onEdgeSelect('edge-external')}>canvas edge</button>
          <button onClick={() => props.onNodeHover('node-1')}>canvas node hover</button>
          <button onClick={() => props.onNodeHover(null)}>canvas node leave</button>
          <button onClick={() => props.onEdgeHover('edge-external')}>canvas edge hover</button>
          <button onClick={() => props.onRuntimeStateChange({ kind: 'failure' })}>runtime failure</button>
        </div>
      );
    })
  };
});

describe('TopologyPageView evidence', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each(['loading', 'empty', 'permission', 'unavailable', 'contract', 'error'] as const)(
    'renders %s as distinct non-ready evidence',
    kind => {
      renderView({ evidence: kind === 'empty' ? { kind, presentation } : { kind } });
      expect(screen.getByText(i18n.t(`topology.evidence.${kind}`))).toBeInTheDocument();
      expect(screen.queryByTestId('topology-canvas')).not.toBeInTheDocument();
    }
  );

  it('keeps canvas, table, detail, hover and selection linked in memory', () => {
    renderLinkedView();
    fireEvent.click(screen.getByRole('button', { name: 'canvas node' }));
    expect(screen.getAllByText('checkout').length).toBeGreaterThan(1);
    expect(screen.getByTestId('topology-canvas').dataset.interaction).toContain('"nodeId":"node-1"');

    fireEvent.click(screen.getByRole('button', { name: 'canvas edge hover' }));
    expect(screen.getByRole('row', { name: /payments\.example/ }).className).toContain('topologyRowActive');
    fireEvent.click(screen.getByRole('row', { name: /payments\.example/ }));
    expect(screen.getAllByText('payments.example').length).toBeGreaterThan(1);
  });

  it('starts with the complete scope filter collapsed and keeps canvas actions available', () => {
    renderLinkedView();
    const canvasFrame = screen.getByTestId('topology-canvas').parentElement;
    if (!canvasFrame) throw new Error('The topology canvas frame is missing.');

    expect(screen.queryByLabelText(i18n.t('topology.toolbar.focusEntity'))).not.toBeInTheDocument();
    expect(within(canvasFrame).getByRole('button', { name: i18n.t('topology.toolbar.filter') })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByRole('button', { name: i18n.t('topology.toolbar.fit') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('common.refresh') })).toBeInTheDocument();

    fireEvent.click(within(canvasFrame).getByRole('button', { name: i18n.t('topology.toolbar.filter') }));

    expect(within(canvasFrame).getByLabelText(i18n.t('topology.toolbar.focusEntity'))).toBeInTheDocument();
    expect(within(canvasFrame).getAllByLabelText(i18n.t('topology.toolbar.depth')).length).toBeGreaterThan(0);
    expect(within(canvasFrame).getByLabelText(i18n.t('topology.toolbar.environment'))).toBeInTheDocument();
    expect(within(canvasFrame).getByLabelText(i18n.t('topology.toolbar.sourceKind'))).toBeInTheDocument();
    expect(within(canvasFrame).getByLabelText(i18n.t('topology.toolbar.relationType'))).toBeInTheDocument();
    expect(within(canvasFrame).getByLabelText(i18n.t('topology.toolbar.hideInternal'))).toBeInTheDocument();
  });

  it('keeps zoom, fit, exact scale, and refresh controls inside the canvas surface', () => {
    const onFit = vi.fn();
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onRefresh = vi.fn();
    render(renderContent({ scale: 1.4, onFit, onZoomIn, onZoomOut, onRefresh }));

    const canvasFrame = screen.getByTestId('topology-canvas').parentElement;
    if (!canvasFrame) throw new Error('The topology canvas frame is missing.');
    expect(within(canvasFrame).getByText('140%')).toBeInTheDocument();
    fireEvent.click(within(canvasFrame).getByRole('button', { name: i18n.t('topology.canvas.zoomOut') }));
    fireEvent.click(within(canvasFrame).getByRole('button', { name: i18n.t('topology.canvas.zoomIn') }));
    fireEvent.click(within(canvasFrame).getByRole('button', { name: i18n.t('topology.toolbar.fit') }));
    fireEvent.click(within(canvasFrame).getByRole('button', { name: i18n.t('common.refresh') }));

    expect(onZoomOut).toHaveBeenCalledOnce();
    expect(onZoomIn).toHaveBeenCalledOnce();
    expect(onFit).toHaveBeenCalledOnce();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('keeps the context band limited to real counts and the exact window', () => {
    renderLinkedView();
    const contextBand = screen.getByRole('banner');

    expect(within(contextBand).getByText(i18n.t('topology.summary.nodes'))).toBeInTheDocument();
    expect(within(contextBand).getByText(i18n.t('topology.summary.edges'))).toBeInTheDocument();
    expect(within(contextBand).getByText(i18n.t('topology.summary.window'))).toBeInTheDocument();
    expect(contextBand).not.toHaveTextContent('healthy');
    expect(contextBand).not.toHaveTextContent(i18n.t('topology.metrics.errorRate'));
  });

  it('keeps the evidence table interactive after collapsing and reopening its lower section', () => {
    renderLinkedView();
    const toggle = screen.getByRole('button', { name: i18n.t('topology.table.toggle') });

    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const edgeRow = screen.getByRole('row', { name: /payments\.example/ });
    fireEvent.keyDown(edgeRow, { key: 'Enter' });
    expect(screen.getAllByText('payments.example').length).toBeGreaterThan(1);
  });

  it('opens compact node detail from canvas selection and clears selection when closed', () => {
    useCompactViewport();
    renderLinkedView();

    fireEvent.click(screen.getByRole('button', { name: 'canvas node' }));
    const drawer = screen.getByRole('dialog', { name: i18n.t('topology.detail.title') });
    expect(within(drawer).getByText('checkout')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: i18n.t('topology.detail.title') })).not.toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    expect(JSON.parse(screen.getByTestId('topology-canvas').dataset.interaction!).selected).toEqual({ kind: 'none' });
    expect(screen.queryByRole('dialog', { name: i18n.t('topology.detail.title') })).not.toBeInTheDocument();
  });

  it('opens compact edge detail from canvas and table keyboard selection', () => {
    useCompactViewport();
    renderLinkedView();

    fireEvent.click(screen.getByRole('button', { name: 'canvas edge' }));
    expect(within(screen.getByRole('dialog')).getByText('payments.example')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));

    const edgeRow = screen.getByRole('row', { name: /payments\.example/ });
    fireEvent.keyDown(edgeRow, { key: 'Enter' });
    expect(within(screen.getByRole('dialog')).getByText('payments.example')).toBeInTheDocument();
  });

  it('keeps one companion rail and no duplicate drawer at wide viewport', () => {
    renderLinkedView();
    fireEvent.click(screen.getByRole('button', { name: 'canvas node' }));

    expect(screen.getByRole('complementary', { name: i18n.t('topology.detail.title') })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: i18n.t('topology.detail.title') })).not.toBeInTheDocument();
    expect(screen.getAllByText(i18n.t('topology.detail.title'))).toHaveLength(1);
  });

  it('delegates selected-node entity and exact-window signal actions', () => {
    const openEntity = vi.fn();
    const querySignals = vi.fn();
    renderLinkedView({
      state: {
        ...baseState,
        query: { ...baseState.query!, window: { from: 1_000, to: 2_000 } }
      },
      actions: { ...baseActions, openEntity, querySignals }
    });
    fireEvent.click(screen.getByRole('button', { name: 'canvas node' }));

    fireEvent.click(screen.getByRole('button', { name: i18n.t('topology.detail.openEntity') }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('topology.detail.querySignals') }));

    expect(openEntity).toHaveBeenCalledWith(1);
    expect(querySignals).toHaveBeenCalledWith(expect.objectContaining({ id: 'node-1', entityName: 'checkout' }), {
      from: 1_000,
      to: 2_000
    });
  });

  it('labels and delegates selected-edge actions explicitly to the source entity', () => {
    const openEntity = vi.fn();
    const querySignals = vi.fn();
    renderLinkedView({
      state: {
        ...baseState,
        query: { ...baseState.query!, window: { from: 1_000, to: 2_000 } }
      },
      actions: { ...baseActions, openEntity, querySignals }
    });
    fireEvent.click(screen.getByRole('button', { name: 'canvas edge' }));

    fireEvent.click(screen.getByRole('button', { name: i18n.t('topology.detail.openSourceEntity') }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('topology.detail.querySourceSignals') }));

    expect(openEntity).toHaveBeenCalledWith(1);
    expect(querySignals).toHaveBeenCalledWith(expect.objectContaining({ id: 'node-1', entityName: 'checkout' }), {
      from: 1_000,
      to: 2_000
    });
  });

  it('switches inspector ownership on resize and removes its media listener on unmount', () => {
    const viewport = useViewport(false);
    const view = renderLinkedView();
    fireEvent.click(screen.getByRole('button', { name: 'canvas node' }));
    expect(screen.getByRole('complementary', { name: i18n.t('topology.detail.title') })).toBeInTheDocument();

    viewport.resize(true);
    expect(screen.getByRole('dialog', { name: i18n.t('topology.detail.title') })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: i18n.t('topology.detail.title') })).not.toBeInTheDocument();

    viewport.resize(false);
    expect(screen.getByRole('complementary', { name: i18n.t('topology.detail.title') })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: i18n.t('topology.detail.title') })).not.toBeInTheDocument();

    view.unmount();
    expect(viewport.compactListenerCount()).toBe(0);
  });

  it('falls back to the persistent rail when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useCompactTopologyInspector());
    expect(result.current).toBe(false);
  });

  it('clears canvas and table hover to the exact none interaction state', () => {
    renderLinkedView();
    const canvas = screen.getByTestId('topology-canvas');

    fireEvent.click(screen.getByRole('button', { name: 'canvas node hover' }));
    expect(JSON.parse(canvas.dataset.interaction!).hover).toEqual({ kind: 'node', nodeId: 'node-1' });
    fireEvent.click(screen.getByRole('button', { name: 'canvas node leave' }));
    expect(JSON.parse(canvas.dataset.interaction!).hover).toEqual({ kind: 'none' });

    const externalRow = screen.getByRole('row', { name: /payments\.example/ });
    fireEvent.mouseEnter(externalRow);
    expect(JSON.parse(canvas.dataset.interaction!).hover).toEqual({ kind: 'edge', edgeId: 'edge-external' });
    fireEvent.mouseLeave(externalRow);
    expect(JSON.parse(canvas.dataset.interaction!).hover).toEqual({ kind: 'none' });
  });

  it('renders nullable RED metrics as unavailable and preserves external-target evidence', () => {
    renderLinkedView();
    expect(screen.getAllByLabelText(i18n.t('topology.metrics.unavailable')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByRole('row', { name: /payments\.example/ })).toBeInTheDocument();
  });

  it('keeps runtime loading distinct and delegates fit to the canvas handle action', () => {
    const onFit = vi.fn();
    render(renderContent({ onFit }));
    expect(screen.getByText(i18n.t('topology.evidence.runtimeLoading'))).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('topology.toolbar.fit') }));
    expect(onFit).toHaveBeenCalledOnce();
  });

  it('pages edge evidence without fabricating a total and resets page size at the first page', () => {
    const changePage = vi.fn();
    render(
      renderContent({
        state: { ...baseState, query: { ...baseState.query!, pageSize: 1 } },
        actions: { ...baseActions, changePage }
      })
    );
    expect(screen.getByRole('button', { name: i18n.t('topology.pagination.previous') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('topology.pagination.next') }));
    expect(changePage).toHaveBeenCalledWith(1, 1);
  });

  it('accepts only integer focus entity values at the input boundary', () => {
    const changeScope = vi.fn();
    render(renderContent({ actions: { ...baseActions, changeScope } }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('topology.toolbar.filter') }));
    const input = screen.getByLabelText(i18n.t('topology.toolbar.focusEntity'));

    fireEvent.change(input, { target: { value: '7.5' } });
    fireEvent.blur(input);

    expect(changeScope).toHaveBeenCalled();
    changeScope.mock.calls.forEach(([patch]) => {
      if (patch.focusEntityId !== undefined) expect(Number.isInteger(patch.focusEntityId)).toBe(true);
    });
    expect(changeScope).toHaveBeenCalledWith({ focusEntityId: 7 });
  });

  it('shows the active exact window as compact localized time instead of epoch values', () => {
    const window = { from: 1_710_000_000_000, to: 1_710_003_600_000 };
    render(renderContent({ state: { ...baseState, query: { ...baseState.query!, window } } }));
    const statistic = screen.getByText(i18n.t('topology.summary.window')).parentElement;

    expect(statistic).not.toHaveTextContent(String(window.from));
    expect(statistic).not.toHaveTextContent(String(window.to));
    expect(statistic).not.toHaveTextContent('—');
  });

  it('keeps refresh failure over ready evidence and exposes runtime failure separately', () => {
    function Harness() {
      const [runtimeState, setRuntimeState] = useState<TopologyCanvasRuntimeState>({ kind: 'ready' });
      return renderContent({
        state: {
          ...baseState,
          evidence: { kind: 'ready', presentation },
          refreshFailure: { kind: 'unavailable' }
        },
        runtimeState,
        onRuntimeStateChange: state => setRuntimeState(state)
      });
    }
    render(<Harness />);
    expect(screen.getByText(i18n.t('topology.evidence.refreshFailure'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'runtime failure' }));
    expect(screen.getByText(i18n.t('topology.evidence.runtimeFailure'))).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});

const presentation = buildTopologyPresentation(topologyGraph());

function renderLinkedView(patch: Partial<TopologyPageViewProps> = {}) {
  function Harness() {
    const [interaction, setInteraction] = useState(emptyTopologyInteraction());
    return renderContent({
      ...patch,
      interaction,
      actions: {
        ...(patch.actions ?? baseActions),
        drilldown: row => setInteraction(value => drilldownTopologyRow(value, row)),
        clearSelection: () => setInteraction(value => clearTopologySelection(value)),
        clearHover: () => setInteraction(value => clearTopologyHover(value)),
        hoverEdge: edgeId => setInteraction(value => hoverTopologyEdge(value, edgeId)),
        hoverNode: nodeId => setInteraction(value => hoverTopologyNode(value, nodeId)),
        selectEdge: edgeId => setInteraction(value => selectTopologyEdge(value, edgeId)),
        selectNode: nodeId => setInteraction(value => selectTopologyNode(value, nodeId))
      }
    });
  }
  return render(<Harness />);
}

function useCompactViewport() {
  return useViewport(true);
}

function useViewport(initialCompact: boolean) {
  const compactQuery = '(max-width: 1199px)';
  let compact = initialCompact;
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      const queryListeners = listeners.get(query) ?? new Set();
      listeners.set(query, queryListeners);
      return {
        get matches() {
          return query === compactQuery && compact;
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((_event: string, update: (event: MediaQueryListEvent) => void) => {
          queryListeners.add(update);
        }),
        removeEventListener: vi.fn((_event: string, update: (event: MediaQueryListEvent) => void) => {
          queryListeners.delete(update);
        }),
        dispatchEvent: vi.fn()
      };
    })
  );
  return {
    compactListenerCount: () => listeners.get(compactQuery)?.size ?? 0,
    resize(nextCompact: boolean) {
      compact = nextCompact;
      const event = { matches: compact, media: compactQuery } as MediaQueryListEvent;
      act(() => listeners.get(compactQuery)?.forEach(listener => listener(event)));
    }
  };
}

function renderView(patch: Partial<TopologyPageViewProps['state']>) {
  return render(renderContent({ state: { ...baseState, ...patch } }));
}

function renderContent(patch: Partial<TopologyPageViewProps> = {}) {
  return (
    <I18nextProvider i18n={i18n}>
      <TopologyPageView
        state={patch.state ?? baseState}
        actions={patch.actions ?? baseActions}
        interaction={patch.interaction ?? emptyTopologyInteraction()}
        {...(patch.runtimeState ? { runtimeState: patch.runtimeState } : {})}
        {...(patch.onRuntimeStateChange ? { onRuntimeStateChange: patch.onRuntimeStateChange } : {})}
        scale={patch.scale ?? 1}
        onFit={patch.onFit ?? (() => undefined)}
        onZoomIn={patch.onZoomIn ?? (() => undefined)}
        onZoomOut={patch.onZoomOut ?? (() => undefined)}
        onRefresh={patch.onRefresh ?? (() => undefined)}
      />
    </I18nextProvider>
  );
}

const baseState: TopologyPageViewProps['state'] = {
  query: { depth: 1, pageIndex: 0, pageSize: 25 },
  evidence: { kind: 'ready', presentation },
  refreshing: false
};
const baseActions: TopologyPageViewProps['actions'] = {
  changeScope: () => undefined,
  changePage: () => undefined,
  clearSelection: () => undefined,
  clearHover: () => undefined,
  drilldown: () => undefined,
  hoverEdge: () => undefined,
  hoverNode: () => undefined,
  openEntity: () => undefined,
  querySignals: () => undefined,
  refresh: () => undefined,
  selectEdge: () => undefined,
  selectNode: () => undefined
};

function topologyGraph(): TopologyGraph {
  const metrics = {
    requestRatePerSecond: null,
    requestCount: null,
    errorRate: null,
    errorCount: null,
    latencyP95Ms: null,
    latencyAvgMs: null
  };
  return {
    apiBacked: true,
    focusEntityId: 1,
    depth: 1,
    sourceKinds: ['otel'],
    nodes: [
      {
        id: 'node-1',
        entityId: 1,
        entityName: 'checkout',
        entityType: 'service',
        namespace: 'store',
        environment: 'prod',
        health: 'healthy',
        focus: true,
        evidenceBadges: [],
        redMetrics: metrics
      }
    ],
    edges: [
      {
        id: 'edge-external',
        relationId: null,
        sourceNodeId: 'node-1',
        targetNodeId: null,
        sourceEntityId: 1,
        targetEntityId: null,
        targetRef: 'payments.example',
        sampleTraceId: null,
        sampleSpanId: null,
        firstSeen: null,
        lastSeen: null,
        relationType: 'calls',
        relationSource: 'otel',
        status: 'observed',
        score: null,
        evidenceBadges: [],
        redMetrics: metrics
      }
    ],
    impactTimeline: []
  };
}
