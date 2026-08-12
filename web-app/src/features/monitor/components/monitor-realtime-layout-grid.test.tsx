/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import type { MonitorMetricLayoutActions, MonitorMetricLayoutState } from '../model/monitor-metric-layout-model';
import { MonitorRealtimeLayoutGrid } from './monitor-realtime-layout-grid';

const gridHarness = vi.hoisted(() => ({ width: 876 }));

vi.mock('react-grid-layout', () => ({
  default: ({
    children,
    dragConfig,
    gridConfig,
    layout,
    resizeConfig
  }: {
    children: ReactNode;
    dragConfig: { enabled: boolean; handle?: string; cancel?: string };
    gridConfig: { cols: number };
    layout: Array<{ i: string; x: number; w: number }>;
    resizeConfig: { enabled: boolean };
  }) => (
    <div
      data-testid="grid-layout"
      data-cols={gridConfig.cols}
      data-drag-enabled={dragConfig.enabled}
      data-drag-handle={dragConfig.handle}
      data-drag-cancel={dragConfig.cancel}
      data-resize-enabled={resizeConfig.enabled}
      data-layout={JSON.stringify(layout)}
    >
      {children}
    </div>
  ),
  useContainerWidth: () => ({ width: gridHarness.width, containerRef: { current: null }, mounted: true }),
  verticalCompactor: {}
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

afterEach(cleanup);

describe('MonitorRealtimeLayoutGrid', () => {
  it('opens a canonical desktop editing canvas at an ordinary tablet-width work surface', () => {
    renderGrid(layoutState({ editing: true }));

    const grid = screen.getByTestId('grid-layout');
    expect(grid).toHaveAttribute('data-cols', '12');
    expect(grid).toHaveAttribute('data-drag-enabled', 'true');
    expect(grid).toHaveAttribute('data-resize-enabled', 'true');
    expect(grid).toHaveAttribute('data-drag-handle', '[data-layout-panel-header]');
    expect(grid).toHaveAttribute('data-drag-cancel', 'button, a');
    expect(screen.queryByRole('toolbar', { name: 'monitorMetrics.layout.card basic' })).not.toBeInTheDocument();
    expect(JSON.parse(grid.getAttribute('data-layout') ?? '[]')).toEqual([
      expect.objectContaining({ i: 'basic', x: 0, w: 4 }),
      expect.objectContaining({ i: 'cache', x: 4, w: 4 })
    ]);
  });

  it('keeps a saved custom layout on the same desktop grid after editing ends', () => {
    renderGrid(layoutState());

    const grid = screen.getByTestId('grid-layout');
    expect(grid).toHaveAttribute('data-cols', '12');
    expect(grid).toHaveAttribute('data-drag-enabled', 'false');
    expect(JSON.parse(grid.getAttribute('data-layout') ?? '[]')).toEqual([
      expect.objectContaining({ i: 'basic', x: 0, w: 4 }),
      expect.objectContaining({ i: 'cache', x: 4, w: 4 })
    ]);
  });

  it('keeps automatic layouts responsive at an ordinary tablet-width work surface', () => {
    renderGrid(layoutState({ layout: { ...layoutState().layout, mode: 'auto' } }));

    const grid = screen.getByTestId('grid-layout');
    expect(grid).toHaveAttribute('data-cols', '6');
    expect(grid).toHaveAttribute('data-drag-enabled', 'false');
    expect(JSON.parse(grid.getAttribute('data-layout') ?? '[]')).toEqual([
      expect.objectContaining({ i: 'basic', x: 0, w: 3 }),
      expect.objectContaining({ i: 'cache', x: 3, w: 3 })
    ]);
  });
});

function renderGrid(state: MonitorMetricLayoutState) {
  const groups = [
    { group: 'basic' },
    { group: 'cache' }
  ] as MonitorMetricWorkbenchController['state']['realtimeGroups'];
  render(
    <MonitorRealtimeLayoutGrid
      state={state}
      actions={layoutActions()}
      groups={groups}
      renderGroup={group => <article>{group.group}</article>}
    />
  );
}

function layoutState(overrides: Partial<MonitorMetricLayoutState> = {}): MonitorMetricLayoutState {
  return {
    readState: 'ready',
    editing: false,
    saving: false,
    revision: 'layout-r1',
    hasSavedLayout: true,
    layout: {
      schemaVersion: 1,
      mode: 'custom',
      columns: 12,
      items: [
        { group: 'basic', x: 0, y: 0, w: 4, h: 10, collapsed: false, order: 0 },
        { group: 'cache', x: 4, y: 0, w: 4, h: 10, collapsed: false, order: 1 }
      ],
      historyDock: { collapsed: false, height: 12 }
    },
    ...overrides
  };
}

function layoutActions(): MonitorMetricLayoutActions {
  return {
    beginEdit: vi.fn(),
    cancelEdit: vi.fn(),
    changeItems: vi.fn(),
    changeHistoryDock: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined)
  };
}
