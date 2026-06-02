// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import {
  HzTopologyMetricTable,
  type HzTopologyMetricRow
} from './index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('@hertzbeat/ui topology metric table interactions', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
    container?.remove();
    container = undefined;
    vi.restoreAllMocks();
  });

  it('selects rows revealed by the render-window show-more action without changing graph scope', async () => {
    const rows: HzTopologyMetricRow[] = Array.from({ length: 130 }, (_, index) => ({
      id: `edge-${index}`,
      sourceNodeId: `source-${index}`,
      targetNodeId: `target-${index}`,
      source: `source-${index}`,
      target: `target-${index}`,
      relationType: 'trace-call',
      sourceKind: 'otlp-trace-call',
      requestRatePerSecond: index + 1,
      requestCount: index + 10,
      errorRate: 0,
      latencyP95Ms: index + 40,
      tone: 'neutral'
    }));
    const onRowSelect = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <HzTopologyMetricTable
          title="Topology edges"
          rows={rows}
          onRowSelect={onRowSelect}
          renderWindowCompanion={{
            mode: 'windowed',
            totalNodeCount: 260,
            renderedNodeCount: 120,
            hiddenNodeCount: 140,
            totalEdgeCount: rows.length,
            renderedEdgeCount: 80,
            visibleNodeBudget: 120,
            tableCompanion: 'required',
            renderedNodeIds: rows.slice(0, 80).map(row => row.sourceNodeId ?? '')
          }}
        />
      );
    });

    const table = container.querySelector('[data-hz-ui="topology-metric-table"]') as HTMLElement;
    const showMore = container.querySelector(
      '[data-hz-topology-metric-table-row-render-action="show-more"]'
    ) as HTMLButtonElement;

    expect(table.getAttribute('data-hz-topology-metric-table-row-render-budget')).toBe('120');
    expect(table.getAttribute('data-hz-topology-metric-table-rendered-row-count')).toBe('120');
    expect(showMore.getAttribute('data-hz-topology-metric-table-row-render-action-invariants')).toBe(
      'append-rows-only no-url-change no-g6-remount viewport-preserved selection-preserved'
    );
    expect(container.querySelector('[data-hz-topology-edge-row="edge-120"]')).toBeNull();

    await act(async () => {
      showMore.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    const revealedRow = container.querySelector('[data-hz-topology-edge-row="edge-120"]') as HTMLButtonElement;

    expect(table.getAttribute('data-hz-topology-metric-table-row-render-budget')).toBe('130');
    expect(table.getAttribute('data-hz-topology-metric-table-rendered-row-count')).toBe('130');
    expect(revealedRow).toBeTruthy();
    expect(revealedRow.getAttribute('data-hz-topology-edge-row-selection-url-policy')).toBe('preserve-current-url');

    await act(async () => {
      revealedRow.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(onRowSelect).toHaveBeenCalledTimes(1);
    expect(onRowSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'edge-120' }));
  });

  it('resets the render budget predictably when filters change after an expanded-row selection', async () => {
    const rows: HzTopologyMetricRow[] = Array.from({ length: 130 }, (_, index) => ({
      id: `edge-${index}`,
      sourceNodeId: `source-${index}`,
      targetNodeId: `target-${index}`,
      source: `source-${index}`,
      target: `target-${index}`,
      relationType: 'trace-call',
      sourceKind: 'otlp-trace-call',
      requestRatePerSecond: index + 1,
      requestCount: index + 10,
      errorRate: 0,
      latencyP95Ms: index + 40,
      tone: 'neutral'
    }));
    const onRowSelect = vi.fn();
    let activeFilter: 'all' | 'visible' | 'partial' | 'hidden' | 'unknown' = 'all';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const renderTable = () => {
      root?.render(
        <HzTopologyMetricTable
          title="Topology edges"
          rows={rows}
          selectedRowId="edge-120"
          renderWindowFilter={activeFilter}
          onRenderWindowFilterChange={filter => {
            activeFilter = filter;
            renderTable();
          }}
          onRowSelect={onRowSelect}
          renderWindowCompanion={{
            mode: 'windowed',
            totalNodeCount: 260,
            renderedNodeCount: 80,
            hiddenNodeCount: 180,
            totalEdgeCount: rows.length,
            renderedEdgeCount: 80,
            visibleNodeBudget: 80,
            tableCompanion: 'required',
            renderedNodeIds: rows.slice(0, 80).flatMap(row => [row.sourceNodeId ?? '', row.targetNodeId ?? ''])
          }}
        />
      );
    };

    await act(async () => {
      renderTable();
    });

    const table = container.querySelector('[data-hz-ui="topology-metric-table"]') as HTMLElement;
    const showMore = container.querySelector(
      '[data-hz-topology-metric-table-row-render-action="show-more"]'
    ) as HTMLButtonElement;

    expect(table.getAttribute('data-hz-topology-metric-table-row-render-reset-policy')).toBe(
      'filter-change-resets-budget-preserve-selected-row'
    );
    expect(
      showMore.getAttribute('data-hz-topology-metric-table-row-render-action-filter-reset-policy')
    ).toBe('reset-row-budget-on-filter-change');
    expect(table.getAttribute('data-hz-topology-metric-table-rendered-row-count')).toBe('121');
    expect(container.querySelector('[data-hz-topology-edge-row="edge-120"]')).toBeTruthy();

    await act(async () => {
      showMore.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(table.getAttribute('data-hz-topology-metric-table-row-render-budget')).toBe('130');
    expect(table.getAttribute('data-hz-topology-metric-table-rendered-row-count')).toBe('130');

    const hiddenFilter = container.querySelector(
      '[data-hz-topology-metric-table-filter-control="hidden"]'
    ) as HTMLButtonElement;

    expect(hiddenFilter.getAttribute('data-hz-topology-metric-table-filter-row-render-reset-policy')).toBe(
      'reset-row-budget-preserve-selection'
    );

    await act(async () => {
      hiddenFilter.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(activeFilter).toBe('hidden');
    expect(table.getAttribute('data-hz-topology-metric-table-render-window-filter')).toBe('hidden');
    expect(table.getAttribute('data-hz-topology-metric-table-row-render-policy')).toBe('all-filtered-rows');
    expect(table.getAttribute('data-hz-topology-metric-table-row-render-budget')).toBe('50');
    expect(table.getAttribute('data-hz-topology-metric-table-rendered-row-count')).toBe('50');
    expect(container.querySelector('[data-hz-topology-edge-row="edge-120"]')?.getAttribute('data-hz-topology-edge-selected')).toBe('true');
  });

  it('exposes selected partial row metadata on the table root after row selection', async () => {
    const rows: HzTopologyMetricRow[] = [
      {
        id: 'edge-visible',
        sourceNodeId: 'gateway',
        targetNodeId: 'checkout',
        source: 'Gateway',
        target: 'Checkout',
        relationType: 'trace-call',
        sourceKind: 'otlp-trace-call',
        requestRatePerSecond: 4,
        requestCount: 12,
        errorRate: 0,
        latencyP95Ms: 18,
        tone: 'neutral'
      },
      {
        id: 'edge-partial',
        sourceNodeId: 'gateway',
        targetNodeId: 'orders-db',
        source: 'Gateway',
        target: 'Orders DB',
        relationType: 'trace-call',
        sourceKind: 'otlp-trace-call',
        requestRatePerSecond: 7,
        requestCount: 21,
        errorRate: 0,
        latencyP95Ms: 25,
        tone: 'neutral'
      }
    ];
    let selectedRowId: string | undefined;
    const onRowSelect = vi.fn((row: HzTopologyMetricRow) => {
      selectedRowId = row.id;
      renderTable();
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const renderTable = () => {
      root?.render(
        <HzTopologyMetricTable
          title="Topology edges"
          rows={rows}
          selectedRowId={selectedRowId}
          selectionSource={selectedRowId ? 'table-row-click' : 'none'}
          renderWindowFilter="partial"
          onRowSelect={onRowSelect}
          renderWindowCompanion={{
            mode: 'windowed',
            totalNodeCount: 3,
            renderedNodeCount: 2,
            hiddenNodeCount: 1,
            totalEdgeCount: rows.length,
            renderedEdgeCount: 1,
            visibleNodeBudget: 2,
            tableCompanion: 'required',
            renderedNodeIds: ['gateway', 'checkout']
          }}
        />
      );
    };

    await act(async () => {
      renderTable();
    });

    const table = container.querySelector('[data-hz-ui="topology-metric-table"]') as HTMLElement;
    const partialRow = container.querySelector('[data-hz-topology-edge-row="edge-partial"]') as HTMLButtonElement;

    expect(table.getAttribute('data-hz-topology-metric-table-render-window-filter')).toBe('partial');
    expect(table.getAttribute('data-hz-topology-metric-table-selected-edge-id')).toBe('none');
    expect(partialRow.getAttribute('data-hz-topology-edge-row-render-window-visibility')).toBe('partial');

    await act(async () => {
      partialRow.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(onRowSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'edge-partial' }));
    expect(table.getAttribute('data-hz-topology-metric-table-selected-edge-id')).toBe('edge-partial');
    expect(table.getAttribute('data-hz-topology-metric-table-selection-source')).toBe('table-row-click');
    expect(table.getAttribute('data-hz-topology-metric-table-selected-row-render-window-visibility')).toBe('partial');
    expect(table.getAttribute('data-hz-topology-metric-table-selected-row-source-visible')).toBe('true');
    expect(table.getAttribute('data-hz-topology-metric-table-selected-row-target-visible')).toBe('false');
  });
});
