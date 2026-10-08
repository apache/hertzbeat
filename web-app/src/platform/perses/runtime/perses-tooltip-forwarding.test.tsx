/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ChartsProvider, EChart, generateChartsTheme, TimeChartTooltip } from '@perses-dev/components';
import { TimeSeriesChartPanel, type TimeSeriesChartProps } from '@perses-dev/timeseries-chart-plugin/lib/index.js';
import { afterEach, expect, it, vi } from 'vitest';
import { HertzBeatTimeZoneProvider } from '../index';
vi.mock('@perses-dev/components', async original => ({
  ...(await original<typeof import('@perses-dev/components')>()),
  EChart: vi.fn(() => <canvas data-testid="canvas-boundary" />),
  getPointInGrid: () => [2000, 1],
  TimeChartTooltip: vi.fn(() => null)
}));
vi.mock('@perses-dev/plugin-system', async original => ({
  ...(await original<typeof import('@perses-dev/plugin-system')>()),
  useTimeRange: () => ({ setTimeRange: vi.fn() })
}));
vi.mock('@perses-dev/dashboards', async original => ({
  ...(await original<typeof import('@perses-dev/dashboards')>()),
  useAnnotationsWithData: () => []
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const theme = createTheme();
const props: TimeSeriesChartProps = {
  spec: { tooltip: { enablePinning: true } },
  contentDimensions: { width: 800, height: 300 },
  queryResults: [
    {
      definition: { kind: 'TimeSeriesQuery', spec: { plugin: { kind: 'test', spec: {} } } },
      data: {
        timeRange: { start: new Date(1000), end: new Date(3000) },
        stepMs: 1000,
        series: [
          {
            name: 'b',
            values: [
              [1000, 1],
              [2000, 2],
              [3000, 3]
            ]
          }
        ]
      }
    }
  ]
};
it.each([false, true])('forwards timestamp through installed Panel and Base while retaining pinning=%s', enabled => {
  const renderer = (timestamp: number) => <span>{timestamp}</span>;
  function Subject({ custom }: { custom: boolean }) {
    return (
      <ThemeProvider theme={theme}>
        <ChartsProvider enablePinning={enabled} chartsTheme={generateChartsTheme(theme, {})}>
          <HertzBeatTimeZoneProvider timeZone="UTC">
            <TimeSeriesChartPanel {...props} {...(custom ? { renderTimestamp: renderer } : {})} />
          </HertzBeatTimeZoneProvider>
        </ChartsProvider>
      </ThemeProvider>
    );
  }
  const view = render(<Subject custom />);
  expect(vi.mocked(TimeChartTooltip).mock.lastCall?.[0]).toMatchObject({
    renderTimestamp: renderer,
    enablePinning: enabled,
    pinnedPos: null
  });
  view.rerender(<Subject custom={false} />);
  expect(vi.mocked(TimeChartTooltip).mock.lastCall?.[0].renderTimestamp).toBeUndefined();
  expect(vi.mocked(TimeChartTooltip).mock.lastCall?.[0].enablePinning).toBe(enabled);
  fireEvent.click(screen.getByTestId('canvas-boundary'), { clientX: 10, clientY: 10 });
  const tooltip = vi.mocked(TimeChartTooltip).mock.lastCall?.[0];
  expect(tooltip?.pinnedPos !== null).toBe(enabled);
  if (enabled) {
    act(() => tooltip?.onUnpinClick?.());
    expect(vi.mocked(TimeChartTooltip).mock.lastCall?.[0].pinnedPos).toBeNull();
  }
});

it('clears pinned coordinates when shifted tooltip pinning is disabled on a retained chart', () => {
  function Subject({ enabled }: { enabled: boolean }) {
    return (
      <ThemeProvider theme={theme}>
        <ChartsProvider enablePinning={enabled} chartsTheme={generateChartsTheme(theme, {})}>
          <HertzBeatTimeZoneProvider timeZone="UTC">
            <TimeSeriesChartPanel {...props} />
          </HertzBeatTimeZoneProvider>
        </ChartsProvider>
      </ThemeProvider>
    );
  }
  const view = render(<Subject enabled />);
  fireEvent.click(screen.getByTestId('canvas-boundary'), { clientX: 10, clientY: 10 });
  expect(vi.mocked(TimeChartTooltip).mock.lastCall?.[0].pinnedPos).not.toBeNull();
  view.rerender(<Subject enabled={false} />);
  expect(vi.mocked(TimeChartTooltip).mock.lastCall?.[0].pinnedPos).toBeNull();
});

it.each([false, true])('reserves internal ECharts tooltip events for stacked bars=%s', stacked => {
  render(
    <ThemeProvider theme={theme}>
      <ChartsProvider chartsTheme={generateChartsTheme(theme, {})}>
        <HertzBeatTimeZoneProvider timeZone="UTC">
          <TimeSeriesChartPanel
            {...props}
            spec={{ ...props.spec, visual: stacked ? { display: 'bar', stack: 'all' } : { display: 'line' } }}
          />
        </HertzBeatTimeZoneProvider>
      </ChartsProvider>
    </ThemeProvider>
  );
  expect(vi.mocked(EChart).mock.lastCall?.[0].option.tooltip).toMatchObject({
    showContent: stacked,
    triggerOn: stacked ? 'mousemove|click' : 'none'
  });
});
