import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MonitorRealtimePanel } from './monitor-realtime-panel';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();

const payload = {
  time: 1712730000000,
  fields: [{ name: 'usage', unit: '%' }, { name: 'idle', unit: '%' }],
  valueRows: [
    { labels: { host: 'db-1' }, values: [{ origin: '72' }, { origin: '28' }] },
    { labels: { host: 'db-2' }, values: [{ origin: '64' }, { origin: '36' }] }
  ]
} as any;

describe('monitor realtime panel', () => {
  it('renders collect time facts and fullscreen trigger', () => {
    const html = renderToStaticMarkup(
      <MonitorRealtimePanel
        payload={payload}
        selectedRowKey="0"
        mode="table"
        expanded={false}
        onSelect={() => {}}
        onModeChange={() => {}}
        onRefresh={() => {}}
        onToggleExpanded={() => {}}
        formatTime={() => '2026-04-11 10:00:00'}
        t={t}
      />
    );

    expect(html).toContain('Collect time');
    expect(html).toContain('2026-04-11 10:00:00');
    expect(html).toContain('Fields');
    expect(html).toContain('Rows');
    expect(html).toContain('Fullscreen');
    expect(html).toContain('Refresh');
    expect(html).toContain('Search rows');
    expect(html).toContain('2 / 2 rows');
    expect(html).toContain('Row 1 / 2');
    expect(html).toContain('Active row');
    expect(html).toContain('Fields');
    expect(html).toContain('Labels');
    expect(html).toContain('host=db-1');
    expect(html).toContain('usage');
    expect(html).toContain('72');
    expect(html).toContain('idle');
    expect(html).toContain('28');
    expect(html).toContain('Previous');
    expect(html).toContain('Next');
    expect(html).not.toContain('Live sample matrix');
    expect(html).not.toContain('Row inspector');
    expect(html).not.toContain('Realtime stage');
    expect(html).not.toContain('Inspect the latest metric rows and row details.');
    expect(html).toMatch(/data-monitor-surface=\"realtime-stage\"/);
    expect(html).toContain('data-monitor-realtime-selection-reset="angular-table-reload"');
    expect(html).toContain('data-monitor-realtime-toolbar-owner="hertzbeat-ui-realtime-toolbar"');
    expect(html).toContain('data-monitor-realtime-inspector-owner="hertzbeat-ui-realtime-inspector"');
    expect(html).toContain('data-monitor-realtime-inspector-variant="details"');
    expect(html).not.toContain('data-monitor-realtime-inspector-variant="summary"');
    expect(html).not.toMatch(/data-monitor-surface-panel=\"row-inspector\"/);
  });

  it('renders a compact inline surface without expanding row search and inspector details', () => {
    const html = renderToStaticMarkup(
      <MonitorRealtimePanel
        payload={payload}
        selectedRowKey="0"
        mode="detail"
        compact
        expanded={false}
        onSelect={() => {}}
        onModeChange={() => {}}
        onRefresh={() => {}}
        onToggleExpanded={() => {}}
        formatTime={() => '2026-04-11 10:00:00'}
        t={t}
      />
    );

    expect(html).toMatch(/data-monitor-surface=\"realtime-stage\"/);
    expect(html).toMatch(/data-monitor-surface-compact=\"true\"/);
    expect(html).toContain('data-monitor-surface-owner="hertzbeat-ui-detail-stage"');
    expect(html).toContain('data-monitor-surface-compact-layout="flat-inline"');
    expect(html).toContain('data-monitor-realtime-wrapper="hertzbeat-ui-detail-stage"');
    expect(html).toContain('data-monitor-realtime-toolbar-owner="hertzbeat-ui-realtime-toolbar"');
    expect(html).toContain('data-monitor-realtime-action-band="shared-monitor-data-table"');
    expect(html).toContain('data-monitor-realtime-action-group="shared-metric-extra"');
    expect(html).toContain('data-monitor-realtime-action-density="hertzbeat-ui-compact-actions"');
    expect(html).toContain('data-monitor-realtime-expand-action-density="hertzbeat-ui-link-action"');
    expect(html).toContain('data-monitor-realtime-collect-time="true"');
    expect(html).toContain('data-hz-ui="monitor-detail-stage"');
    expect(html).not.toMatch(/class=\"[^\"]*monitor-workbench-surface[^\"]*monitor-workbench-surface--plain[^\"]*monitor-realtime-data-table/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-realtime-data-table[^\"]*space-y-1[^\"]*border-t[^\"]*pt-1/);
    expect(html).not.toMatch(/class=\"[^\"]*monitor-workbench-surface__header/);
    expect(html).toContain('Collect time');
    expect(html).toContain('Fullscreen');
    expect(html).not.toMatch(/>Refresh<\/button>/);
    expect(html).not.toContain('Realtime stage');
    expect(html).not.toContain('Inspect the latest metric rows and row details.');
    expect(html).not.toContain('Fields');
    expect(html).not.toContain('Rows');
    expect(html).not.toContain('Search rows');
    expect(html).not.toContain('Row 1 / 2');
    expect(html).not.toContain('Active row');
    expect(html).not.toContain('host=db-1');
    expect(html).not.toMatch(/data-monitor-surface-panel=\"row-inspector\"/);
    expect(html).not.toContain('data-monitor-realtime-inspector-owner="hertzbeat-ui-realtime-inspector"');
  });

  it('disables row navigation at the current boundaries', () => {
    const firstRowHtml = renderToStaticMarkup(
      <MonitorRealtimePanel
        payload={payload}
        selectedRowKey="0"
        mode="table"
        expanded={false}
        onSelect={() => {}}
        onModeChange={() => {}}
        onRefresh={() => {}}
        onToggleExpanded={() => {}}
        formatTime={() => '2026-04-11 10:00:00'}
        t={t}
      />
    );

    const lastRowHtml = renderToStaticMarkup(
      <MonitorRealtimePanel
        payload={payload}
        selectedRowKey="1"
        mode="table"
        expanded={false}
        onSelect={() => {}}
        onModeChange={() => {}}
        onRefresh={() => {}}
        onToggleExpanded={() => {}}
        formatTime={() => '2026-04-11 10:00:00'}
        t={t}
      />
    );

    expect(firstRowHtml).toMatch(/<button[^>]*disabled=""[^>]*>Previous<\/button>/);
    expect(firstRowHtml).not.toMatch(/<button[^>]*disabled=""[^>]*>Next<\/button>/);
    expect(firstRowHtml).toContain('data-monitor-realtime-row-nav-owner="hertzbeat-ui-row-navigator"');
    expect(firstRowHtml).toContain('data-monitor-realtime-row-nav-action="previous"');
    expect(firstRowHtml).toContain('data-monitor-realtime-row-nav-action="next"');
    expect(lastRowHtml).not.toMatch(/<button[^>]*disabled=""[^>]*>Previous<\/button>/);
    expect(lastRowHtml).toMatch(/<button[^>]*disabled=""[^>]*>Next<\/button>/);
  });

  it('renders expanded shell when fullscreen mode is on', () => {
    const html = renderToStaticMarkup(
      <MonitorRealtimePanel
        payload={payload}
        selectedRowKey="1"
        mode="detail"
        expanded
        onSelect={() => {}}
        onModeChange={() => {}}
        onRefresh={() => {}}
        onToggleExpanded={() => {}}
        formatTime={() => '2026-04-11 10:00:00'}
        t={t}
      />
    );
    const modalHtml = html.split('data-expanded="true"')[1] ?? '';

    expect(html).toContain('data-expanded="true"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Exit fullscreen');
    expect(html).toContain('host=db-2');
    expect(html).toContain('Row 2 / 2');
    expect(modalHtml).not.toMatch(/>Fullscreen<\/button>/);
  });

  it('routes the fullscreen shell through the shared monitor fullscreen frame owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');

    expect(source).toContain('HzMonitorFullscreenFrame');
    expect(source).toContain('data-monitor-realtime-fullscreen-owner="hertzbeat-ui-fullscreen-frame"');
    expect(source).not.toContain('WorkbenchFullscreenShell');
    expect(source).not.toContain('className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,7,10,0.88)] p-4"');
    expect(source).not.toContain('className="mb-3 flex items-center justify-between gap-3"');
    expect(source).not.toContain('text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]');
    expect(source).not.toContain('mt-1 text-lg font-semibold text-[var(--ops-text-primary)]');
  });

  it('keeps the realtime row inspector owned by the shared UI primitive', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');

    expect(source).toContain('HzMonitorRealtimeInspector');
    expect(source).toContain('data-monitor-realtime-inspector-owner="hertzbeat-ui-realtime-inspector"');
    expect(source).not.toContain('data-monitor-surface-panel="row-inspector"');
    expect(source).not.toContain('border-l border-[var(--ops-border-color)] pl-3 text-right');
    expect(source).not.toContain('MonitorStatGrid');
    expect(source).not.toContain('ObservabilityDetailRows');
  });

  it('keeps realtime row navigation owned by the shared UI primitive', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');

    expect(source).toContain('HzMonitorRealtimeRowNavigator');
    expect(source).toContain('data-monitor-realtime-row-nav-owner="hertzbeat-ui-row-navigator"');
    expect(source).not.toContain('border-y border-[var(--ops-border-color)] px-3 py-2 text-xs text-[var(--ops-text-secondary)]');
    expect(source).not.toContain('disabled={!rowNavigation.canPrevious}');
    expect(source).not.toContain('disabled={!rowNavigation.canNext}');
  });

  it('routes realtime empty row feedback through the shared inline feedback primitive', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');
    const emptyPayload = { ...payload, valueRows: [] } as any;
    const html = renderToStaticMarkup(
      <MonitorRealtimePanel
        payload={emptyPayload}
        selectedRowKey={null}
        mode="table"
        expanded={false}
        onSelect={() => {}}
        onModeChange={() => {}}
        onRefresh={() => {}}
        onToggleExpanded={() => {}}
        formatTime={() => '2026-04-11 10:00:00'}
        t={t}
      />
    );

    expect(source).toContain('HzInlineFeedback');
    expect(source).toContain('data-monitor-realtime-empty-owner="hertzbeat-ui-inline-feedback"');
    expect(source).not.toContain('className="border-y border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-3 py-2 text-sm text-[var(--ops-text-secondary)]"');
    expect(html).toContain('data-hz-ui="inline-feedback"');
    expect(html).toContain('data-monitor-realtime-empty-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('No rows matched the search.');
  });

  it('does not wrap the shared realtime metric table in page-local border chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorRealtimePanel
        payload={payload}
        selectedRowKey="0"
        mode="table"
        expanded={false}
        onSelect={() => {}}
        onModeChange={() => {}}
        onRefresh={() => {}}
        onToggleExpanded={() => {}}
        formatTime={() => '2026-04-11 10:00:00'}
        t={t}
      />
    );

    expect(source).toContain('MonitorMetricTable');
    expect(source).not.toContain('className="border-y border-[var(--ops-border-color)] py-2"');
    expect(html).toContain('data-monitor-metric-table-owner="hertzbeat-ui-data-table"');
  });

  it('does not render the old page-local realtime stage header chrome', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorRealtimePanel
        payload={payload}
        selectedRowKey="0"
        mode="table"
        expanded={false}
        onSelect={() => {}}
        onModeChange={() => {}}
        onRefresh={() => {}}
        onToggleExpanded={() => {}}
        formatTime={() => '2026-04-11 10:00:00'}
        t={t}
      />
    );

    expect(source).not.toContain('border-b border-[var(--ops-border-color)] pb-3');
    expect(source).not.toContain("t('monitor.detail.metric.stage.title')");
    expect(source).not.toContain("t('monitor.detail.metric.stage.copy')");
    expect(html).not.toContain('Realtime stage');
    expect(html).not.toContain('Inspect the latest metric rows and row details.');
    expect(html).not.toContain('data-monitor-realtime-inspector-variant="summary"');
  });

  it('keeps compact realtime actions on the monitor-data-table action band', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');

    expect(source).toContain('HzMonitorDetailStage');
    expect(source).toContain('data-monitor-surface-owner="hertzbeat-ui-detail-stage"');
    expect(source).toContain('data-monitor-realtime-wrapper={compact ? \'hertzbeat-ui-detail-stage\' : undefined}');
    expect(source).toContain('HzMonitorRealtimeToolbar');
    expect(source).toContain('data-monitor-realtime-toolbar-owner="hertzbeat-ui-realtime-toolbar"');
    expect(source).not.toContain('monitor-workbench-surface monitor-workbench-surface--plain monitor-realtime-data-table');
    expect(source).not.toContain('data-monitor-realtime-action-band={compact ? \'monitor-data-table\' : undefined}');
    expect(source).not.toContain('data-monitor-realtime-action-group={compact ? \'metrics-card-extra\' : undefined}');
    expect(source).not.toContain('data-monitor-realtime-action-density={compact ? \'angular-plain-meta\' : undefined}');
    expect(source).not.toContain('data-monitor-realtime-expand-action-density={compact ? \'plain-link\' : undefined}');
    expect(source).not.toContain("variant={compact ? 'plain' : 'default'}");
    expect(source).not.toContain("className={compact ? 'h-6 px-0 py-0 text-[var(--ops-text-tertiary)]' : undefined}");
    expect(source).not.toContain('monitor-realtime-data-table space-y-1 border-t border-[var(--ops-border-color)] pt-1');
    expect(source).not.toContain('monitor-realtime-data-table space-y-2 border-t border-[var(--ops-border-color)] pt-2');
  });

  it('keeps realtime search and fullscreen close controls owned by shared HertzBeat UI primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <MonitorRealtimePanel
        payload={payload}
        selectedRowKey="0"
        mode="table"
        expanded
        onSelect={() => {}}
        onModeChange={() => {}}
        onRefresh={() => {}}
        onToggleExpanded={() => {}}
        formatTime={() => '2026-04-11 10:00:00'}
        t={t}
      />
    );

    expect(source).toContain('HzInput');
    expect(source).toContain('HzDataMetaText');
    expect(source).toContain('HzControlStack');
    expect(source).toContain('HzButton');
    expect(source).toContain('HzMonitorFullscreenFrame');
    expect(source).toContain('data-monitor-realtime-search-stack-owner="hertzbeat-ui-control-stack"');
    expect(source).toContain('data-monitor-realtime-search-owner="hertzbeat-ui-input"');
    expect(source).toContain('data-monitor-realtime-search-count-owner="hertzbeat-ui-data-meta-text"');
    expect(source).toContain('display="block"');
    expect(source).toContain('casing="plain"');
    expect(source).toContain('data-monitor-realtime-fullscreen-owner="hertzbeat-ui-fullscreen-frame"');
    expect(source).toContain("'data-monitor-realtime-fullscreen-close-owner': 'hertzbeat-ui-button'");
    expect(source).not.toContain('className="block normal-case tracking-normal"');
    expect(source).not.toContain('text-xs text-[var(--ops-text-tertiary)]');
    expect(source).not.toContain('className="space-y-2"');
    expect(source).not.toContain('ObservabilitySearchInput');
    expect(source).not.toContain('ObservabilityControlButton');
    expect(html).toContain('data-hz-ui="input"');
    expect(html).toContain('data-hz-ui="control-stack"');
    expect(html).toContain('data-hz-ui="data-meta-text"');
    expect(html).toContain('data-hz-ui="button"');
    expect(html).toContain('data-hz-ui="monitor-fullscreen-frame"');
    expect(html).toContain('data-monitor-realtime-search-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-monitor-realtime-search-stack-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-monitor-realtime-search-count-owner="hertzbeat-ui-data-meta-text"');
    expect(html).toContain('data-monitor-realtime-fullscreen-owner="hertzbeat-ui-fullscreen-frame"');
    expect(html).toContain('data-monitor-realtime-fullscreen-close-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-hz-control-height="32"');
    expect(html).toContain('data-hz-control-edge="lined"');
  });
});
