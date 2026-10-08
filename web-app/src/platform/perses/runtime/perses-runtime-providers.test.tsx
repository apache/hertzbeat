/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TimeRangeValue } from '@perses-dev/spec';
import type { PluginLoader } from '@perses-dev/plugin-system';
import { generateChartsTheme } from '@perses-dev/components';
import { afterEach, describe, expect, it, vi } from 'vitest';

const window = { from: 1_750_000_000_000, to: 1_750_000_060_000 } as const;
const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('@mui/material/useMediaQuery', () => ({ default: () => motion.reduced }));

vi.mock('@mui/material', () => ({
  ThemeProvider: passthrough,
  createTheme: vi.fn((options: object) => options)
}));
vi.mock('@perses-dev/components', async () => {
  const { createTheme } = await import('@mui/material/styles');
  return {
    ChartsProvider: passthrough,
    SnackbarProvider: passthrough,
    generateChartsTheme: vi.fn(() => ({})),
    getTheme: vi.fn(() => createTheme())
  };
});
vi.mock('@perses-dev/dashboards', () => ({
  DatasourceStoreProvider: passthrough,
  VariableProvider: passthrough
}));
vi.mock('@tanstack/react-query', () => ({
  QueryClient: class QueryClient {},
  QueryClientProvider: passthrough
}));
vi.mock('@perses-dev/plugin-system', () => ({
  PluginRegistry: passthrough,
  RouterProvider: passthrough,
  TimeRangeProvider: ({
    children,
    timeRange,
    setTimeRange
  }: {
    children: React.ReactNode;
    timeRange: TimeRangeValue;
    setTimeRange: (value: TimeRangeValue) => void;
  }) => (
    <>
      {children}
      <output aria-label="active range start">{'start' in timeRange ? timeRange.start.getTime() : 'relative'}</output>
      <button type="button" onClick={() => setTimeRange({ start: new Date(window.from), end: new Date(window.to) })}>
        Same range
      </button>
      <button
        type="button"
        onClick={() => setTimeRange({ start: new Date(window.from + 1_000), end: new Date(window.to - 1_000) })}
      >
        Zoom range
      </button>
      <button type="button" onClick={() => setTimeRange({ start: new Date(Number.NaN), end: new Date(window.to) })}>
        Invalid range
      </button>
    </>
  )
}));
vi.mock('@/core/runtime-theme-context', () => ({ useRuntimeTheme: () => ({ theme: 'default' }) }));

import { PersesRuntimeProviders } from './perses-runtime-providers';

const pluginLoader: PluginLoader = {
  getInstalledPlugins: () => Promise.resolve([]),
  importPluginModule: () => Promise.resolve({})
};

describe('PersesRuntimeProviders time ownership', () => {
  afterEach(() => {
    cleanup();
    motion.reduced = false;
    vi.clearAllMocks();
  });

  it('updates an external buffer window without remounting children or publishing a query', () => {
    const onTimeWindowChange = vi.fn();
    const props = { timeWindow: window, pluginLoader, onTimeWindowChange };
    const view = render(
      <PersesRuntimeProviders {...props}>
        <input aria-label="retained selection" defaultValue="selected" />
      </PersesRuntimeProviders>
    );
    const input = screen.getByRole('textbox');
    view.rerender(
      <PersesRuntimeProviders {...props} timeWindow={{ from: window.from + 1000, to: window.to + 1000 }}>
        <input aria-label="retained selection" defaultValue="selected" />
      </PersesRuntimeProviders>
    );
    expect(screen.getByLabelText('active range start')).toHaveTextContent(String(window.from + 1000));
    expect(screen.getByRole('textbox')).toBe(input);
    expect(onTimeWindowChange).not.toHaveBeenCalled();
  });

  it('passes the reduced-motion preference through the formal chart theme', () => {
    motion.reduced = true;
    render(
      <PersesRuntimeProviders timeWindow={window} pluginLoader={pluginLoader}>
        <div>Evidence</div>
      </PersesRuntimeProviders>
    );
    expect(generateChartsTheme).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ echartsTheme: expect.objectContaining({ animation: false }) })
    );
  });

  it('publishes only a changed safe absolute range and never publishes on mount', () => {
    const onTimeWindowChange = vi.fn();
    render(
      <PersesRuntimeProviders timeWindow={window} pluginLoader={pluginLoader} onTimeWindowChange={onTimeWindowChange}>
        <div>Evidence</div>
      </PersesRuntimeProviders>
    );

    expect(onTimeWindowChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Same range' }));
    fireEvent.click(screen.getByRole('button', { name: 'Invalid range' }));
    expect(onTimeWindowChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Zoom range' }));
    expect(onTimeWindowChange).toHaveBeenCalledOnce();
    expect(onTimeWindowChange).toHaveBeenCalledWith({ from: window.from + 1_000, to: window.to - 1_000 });
  });

  it('keeps a disabled evidence range immutable', () => {
    render(
      <PersesRuntimeProviders timeWindow={window} pluginLoader={pluginLoader} timeWindowChangeEnabled={false}>
        <div>Stale evidence</div>
      </PersesRuntimeProviders>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zoom range' }));
    expect(screen.getByRole('status', { name: 'active range start' })).toHaveTextContent(String(window.from));
  });
});

function passthrough({ children }: { children: React.ReactNode }) {
  return children;
}
