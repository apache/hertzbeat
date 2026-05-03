import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HistoryLineChart } from './history-line-chart';

describe('history line chart', () => {
  it('moves chart quick actions and series toggles onto observability pill buttons', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/history-line-chart.tsx'), 'utf8');

    expect(source).toContain('ObservabilityPillButton');
    expect(source).not.toContain('className="inline-flex items-center rounded-full border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 transition hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)] disabled:cursor-not-allowed disabled:opacity-40"');
    expect(source).not.toContain('className="inline-flex items-center gap-2 rounded-full border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 transition hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)]"');
  });

  it('routes the outer chart shell through the observability inset-panel owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/history-line-chart.tsx'), 'utf8');

    expect(source).toContain('ObservabilityInsetPanel');
    expect(source).not.toContain('className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3"');
    expect(source).not.toContain("from '../workbench/primitives'");
  });

  it('renders selected point state and detail copy for aggregated series', () => {
    const html = renderToStaticMarkup(
      <HistoryLineChart
        values={[
          { mean: '15', min: '10', max: '20', time: 1 },
          { mean: '25', min: '22', max: '29', time: 2 }
        ] as any}
        formatTime={value => `t${value}`}
        aggregated={true}
        selectedPointIndex={1}
        onSelectPoint={() => {}}
      />
    );

    expect(html).toContain('data-selected="true"');
    expect(html).toContain('Mean · t2 · 25');
    expect(html).toContain('selected point');
    expect(html).toContain('Point 2 / 2');
    expect(html).toContain('Previous');
    expect(html).toContain('Next');
    expect(html).toContain('Min');
    expect(html).toContain('22');
    expect(html).toContain('Max');
    expect(html).toContain('29');
    expect(html).toContain('Download SVG');
    expect(html).toContain('monitor-history-aggregated.svg');
    expect(html).toContain('data:image/svg+xml;charset=utf-8,');
    expect(html).toContain('Click or hover the chart to inspect the nearest point');
  });

  it('renders aggregated chart quick presets for primary-only and full-stat views', () => {
    const html = renderToStaticMarkup(
      <HistoryLineChart
        values={[
          { mean: '15', min: '10', max: '20', time: 1 },
          { mean: '25', min: '22', max: '29', time: 2 }
        ] as any}
        formatTime={value => `t${value}`}
        aggregated={true}
        selectedPointIndex={1}
        onSelectPoint={() => {}}
        visibleSeriesKeys={['mean', 'min', 'max']}
        onVisibleSeriesKeysChange={() => {}}
      />
    );

    expect(html).toContain('Primary only');
    expect(html).toContain('Show all stats');
    expect(html).toContain('Mean');
    expect(html).toContain('Min');
    expect(html).toContain('Max');
  });
});
