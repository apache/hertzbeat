import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HistoryLineChart } from './history-line-chart';

describe('history line chart', () => {
  it('routes chart quick actions and series toggles through shared HertzBeat UI buttons', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/history-line-chart.tsx'), 'utf8');

    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzActionGroup');
    expect(source).toContain('HzButton');
    expect(source).toContain('HzButtonLink');
    expect(source).toContain('HzDetailRows');
    expect(source).toContain('HzDataMetaText');
    expect(source).toContain('layout="stack"');
    expect(source).toContain('data-monitor-history-line-action-stack-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-monitor-history-line-action-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-monitor-history-line-control-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-monitor-history-download-owner="hertzbeat-ui-button-link"');
    expect(source).toContain('data-monitor-history-line-point-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-monitor-history-line-meta-owner="hertzbeat-ui-data-meta-text"');
    expect(source).not.toContain('text-[var(--ops-text-tertiary)]');
    expect(source).not.toContain('ObservabilityPillButton');
    expect(source).not.toContain('data-hz-ui="button"');
    expect(source).not.toContain('bg-[var(--hz-ui-action-bg)]');
    expect(source).not.toContain('rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)]');
    expect(source).not.toContain('className="flex flex-wrap gap-2 text-[11px] text-[var(--ops-text-secondary)]"');
    expect(source).not.toContain('className="flex flex-wrap gap-3 text-[11px] text-[var(--ops-text-secondary)]"');
    expect(source).not.toContain('className="flex flex-wrap items-center gap-2 text-xs text-[var(--ops-text-secondary)]"');
    expect(source).not.toContain('className="space-y-2"');
    expect(source).not.toContain('className="inline-flex items-center rounded-full border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 transition hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)] disabled:cursor-not-allowed disabled:opacity-40"');
    expect(source).not.toContain('className="inline-flex items-center gap-2 rounded-full border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 transition hover:border-[var(--ops-primary)] hover:bg-[var(--ops-surface-raised)]"');
  });

  it('routes the outer chart shell through the shared HertzBeat UI chart surface', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/history-line-chart.tsx'), 'utf8');

    expect(source).toContain('HzChartSurface');
    expect(source).toContain('data-monitor-history-line-owner="hertzbeat-ui-chart-surface"');
    expect(source).not.toContain('ObservabilityInsetPanel');
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
    expect(html).toContain('data-monitor-history-line-meta-owner="hertzbeat-ui-data-meta-text"');
    expect(html).toContain('data-hz-ui="data-meta-text"');
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
