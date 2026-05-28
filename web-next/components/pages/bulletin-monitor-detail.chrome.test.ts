import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('bulletin center and monitor-detail cold-workbench chrome', () => {
  it('removes the remaining legacy white, hex, and oversized card chrome from the current slice', () => {
    const bulletinSource = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-center-surface.tsx'), 'utf8');
    const metricTableSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-metric-table.tsx'), 'utf8');
    const historyChartSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/history-line-chart.tsx'), 'utf8');
    const summaryCardSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-summary-card.tsx'), 'utf8');

    expect(bulletinSource).not.toContain('border-white/8');
    expect(bulletinSource).not.toContain('border-white/10');
    expect(bulletinSource).not.toContain('bg-[rgba(');
    expect(bulletinSource).not.toContain('bg-[#111315]');
    expect(bulletinSource).not.toContain('bg-white/[0.04]');
    expect(bulletinSource).not.toContain('bg-white/[0.05]');
    expect(bulletinSource).not.toContain('bg-white/[0.02]');
    expect(bulletinSource).not.toContain('text-white/34');
    expect(bulletinSource).not.toContain('text-white/82');
    expect(bulletinSource).not.toContain('text-[#f3eee6]');
    expect(bulletinSource).not.toContain('text-[#ece5d9]');
    expect(bulletinSource).not.toContain('text-[#a69d90]');

    expect(metricTableSource).not.toContain('border-white/8');
    expect(metricTableSource).not.toContain('text-white');
    expect(metricTableSource).not.toContain('text-white/35');
    expect(metricTableSource).not.toContain('text-white/72');
    expect(metricTableSource).not.toContain('bg-[#171a1d]');
    expect(metricTableSource).not.toContain('hsl(var(--primary)/0.38)');

    expect(historyChartSource).not.toContain('rounded-[14px]');
    expect(historyChartSource).not.toContain('rounded-[12px]');
    expect(historyChartSource).not.toContain('border-white/8');
    expect(historyChartSource).not.toContain('border-white/10');
    expect(historyChartSource).not.toContain('bg-black/15');
    expect(historyChartSource).not.toContain('bg-black/10');
    expect(historyChartSource).not.toContain('bg-white/[0.04]');
    expect(historyChartSource).not.toContain('text-white/60');
    expect(historyChartSource).not.toContain('text-white/72');
    expect(historyChartSource).not.toContain('text-white/38');
    expect(historyChartSource).not.toContain('text-white/70');
    expect(historyChartSource).not.toContain('text-white/55');
    expect(historyChartSource).not.toContain('text-white');

    expect(summaryCardSource).not.toContain('text-white/28');
    expect(summaryCardSource).not.toContain('border-white/10');
    expect(summaryCardSource).not.toContain('text-[#c9c0b4]');
  });

  it('adopts shared ops tokens across the current bulletin and monitor-detail slice', () => {
    const bulletinSource = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-center-surface.tsx'), 'utf8');
    const metricTableSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-metric-table.tsx'), 'utf8');
    const historyChartSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/history-line-chart.tsx'), 'utf8');
    const summaryCardSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-summary-card.tsx'), 'utf8');
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(bulletinSource).toContain('border-[var(--ops-border-color)]');
    expect(bulletinSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(bulletinSource).toContain('bg-[var(--ops-surface-raised)]');
    expect(bulletinSource).toContain('text-[var(--ops-text-primary)]');
    expect(bulletinSource).toContain('text-[var(--ops-text-secondary)]');
    expect(bulletinSource).toContain('text-[var(--ops-text-tertiary)]');

    expect(metricTableSource).toContain('HzDataTable');
    expect(metricTableSource).toContain('data-monitor-metric-table-owner="hertzbeat-ui-data-table"');
    expect(uiSource).toContain('border border-[var(--ops-border-color)]');
    expect(uiSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(uiSource).toContain('text-[var(--ops-text-secondary)]');

    expect(historyChartSource).toContain('HzChartSurface');
    expect(historyChartSource).toContain('data-monitor-history-line-owner="hertzbeat-ui-chart-surface"');
    expect(uiSource).toContain('export function HzChartSurface');
    expect(historyChartSource).not.toContain('className="rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-3"');

    expect(summaryCardSource).toContain('HzMonitorBasicSummary');
    expect(uiSource).toContain('export function HzMonitorBasicSummary');
    expect(summaryCardSource).not.toContain('inline-flex rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 text-xs text-[var(--ops-text-secondary)]');
  });
});
