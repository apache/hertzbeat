/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { TopologyGraph } from '../model/topology-contract';
import type { TopologyCanvasProps, TopologyCanvasRuntimeState } from './topology-canvas';
import {
  buildTopologyPresentation,
  clearTopologyHover,
  drilldownTopologyRow,
  emptyTopologyInteraction,
  hoverTopologyEdge,
  hoverTopologyNode,
  selectTopologyNode
} from '../model/topology-view-model';
import { TopologyPageView, type TopologyPageViewProps } from './topology-page-view';

const canvasBoundary = vi.hoisted(() => ({ fit: vi.fn() }));
vi.mock('./topology-canvas', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    TopologyCanvas: forwardRef(function CanvasBoundary(props: TopologyCanvasProps, ref) {
      useImperativeHandle(ref, () => ({ fit: canvasBoundary.fit }));
      return (
        <div data-testid="topology-canvas" data-interaction={JSON.stringify(props.interaction)}>
          <button onClick={() => props.onNodeSelect('node-1')}>canvas node</button>
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
  afterEach(cleanup);

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
    const statistic = screen.getByText(i18n.t('topology.summary.window')).closest('.ant-statistic');

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

function renderLinkedView() {
  function Harness() {
    const [interaction, setInteraction] = useState(emptyTopologyInteraction());
    return renderContent({
      interaction,
      actions: {
        ...baseActions,
        drilldown: row => setInteraction(value => drilldownTopologyRow(value, row)),
        clearHover: () => setInteraction(value => clearTopologyHover(value)),
        hoverEdge: edgeId => setInteraction(value => hoverTopologyEdge(value, edgeId)),
        hoverNode: nodeId => setInteraction(value => hoverTopologyNode(value, nodeId)),
        selectNode: nodeId => setInteraction(value => selectTopologyNode(value, nodeId))
      }
    });
  }
  return render(<Harness />);
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
        runtimeState={patch.runtimeState}
        onRuntimeStateChange={patch.onRuntimeStateChange}
        onFit={patch.onFit ?? (() => undefined)}
        onRefresh={() => undefined}
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
