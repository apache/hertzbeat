/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MonitorMetricLayoutActions, MonitorMetricLayoutState } from '../model/monitor-metric-layout-model';
import { MonitorMetricLayoutToolbar } from './monitor-metric-layout-toolbar';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('MonitorMetricLayoutToolbar', () => {
  it('keeps the ordinary view quiet until the operator explicitly edits', () => {
    const actions = layoutActions();
    render(<MonitorMetricLayoutToolbar state={layoutState()} actions={actions} />);

    expect(screen.getByRole('button', { name: 'monitorMetrics.layout.edit' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'common.save' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'monitorMetrics.layout.edit' }));
    expect(actions.beginEdit).toHaveBeenCalledOnce();
  });

  it('keeps edit mode focused on direct manipulation plus save, cancel, and reset', () => {
    const actions = layoutActions();
    render(<MonitorMetricLayoutToolbar state={layoutState({ editing: true })} actions={actions} />);

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    expect(screen.queryByRole('button', { name: 'monitorMetrics.layout.historyTaller' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'monitorMetrics.layout.historyShorter' })).not.toBeInTheDocument();
    expect(actions.cancelEdit).toHaveBeenCalledOnce();
    expect(actions.save).toHaveBeenCalledOnce();
    expect(screen.getByText('monitorMetrics.layout.editHint')).toBeVisible();
  });
});

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
        { group: 'status', x: 4, y: 0, w: 4, h: 10, collapsed: false, order: 1 }
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
