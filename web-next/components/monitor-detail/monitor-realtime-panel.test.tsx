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
    expect(html).toContain('Selected row');
    expect(html).not.toContain('Live sample matrix');
    expect(html).not.toContain('Row inspector');
    expect(html).toMatch(/data-monitor-surface=\"realtime-stage\"/);
    expect(html).toMatch(/data-monitor-surface-panel=\"row-inspector\"/);
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
    expect(html).toContain('data-monitor-surface-compact-layout="cardless-table"');
    expect(html).toContain('data-monitor-realtime-wrapper="monitor-data-table"');
    expect(html).toContain('data-monitor-realtime-action-band="monitor-data-table"');
    expect(html).toContain('data-monitor-realtime-action-group="metrics-card-extra"');
    expect(html).toContain('data-monitor-realtime-action-density="angular-plain-meta"');
    expect(html).toContain('data-monitor-realtime-expand-action-density="plain-link"');
    expect(html).toContain('data-observability-control-button-variant="plain"');
    expect(html).toContain('data-monitor-realtime-collect-time="true"');
    expect(html).toMatch(/class=\"[^\"]*monitor-workbench-surface[^\"]*monitor-workbench-surface--plain[^\"]*monitor-realtime-data-table/);
    expect(html).toMatch(/class=\"[^\"]*monitor-realtime-data-table[^\"]*space-y-1[^\"]*border-t[^\"]*pt-1/);
    expect(html).toMatch(/class=\"[^\"]*monitor-workbench-surface__header/);
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
    expect(html).toContain('Selected row');
    expect(html).toContain('host=db-2');
    expect(html).toContain('Row 2 / 2');
    expect(modalHtml).not.toMatch(/>Fullscreen<\/button>/);
  });

  it('routes the fullscreen shell through the shared workbench fullscreen owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');

    expect(source).toContain('WorkbenchFullscreenShell');
    expect(source).not.toContain('hb-scrollbar max-h-[92vh] w-full max-w-6xl overflow-auto rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]');
  });

  it('keeps compact realtime actions on the monitor-data-table action band', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');

    expect(source).toContain('monitor-workbench-surface monitor-workbench-surface--plain monitor-realtime-data-table');
    expect(source).toContain('data-monitor-realtime-wrapper={compact ? \'monitor-data-table\' : undefined}');
    expect(source).toContain('data-monitor-realtime-action-band={compact ? \'monitor-data-table\' : undefined}');
    expect(source).toContain('data-monitor-realtime-action-group={compact ? \'metrics-card-extra\' : undefined}');
    expect(source).toContain('data-monitor-realtime-action-density={compact ? \'angular-plain-meta\' : undefined}');
    expect(source).toContain('data-monitor-realtime-expand-action-density={compact ? \'plain-link\' : undefined}');
    expect(source).toContain('data-monitor-realtime-collect-time={compact ? \'true\' : undefined}');
    expect(source).toContain("variant={compact ? 'plain' : 'default'}");
    expect(source).toContain("className={compact ? 'h-6 px-0 py-0 text-[var(--ops-text-tertiary)]' : undefined}");
    expect(source).toContain('monitor-realtime-data-table space-y-1 border-t border-[var(--ops-border-color)] pt-1');
    expect(source).not.toContain('monitor-realtime-data-table space-y-2 border-t border-[var(--ops-border-color)] pt-2');
    expect(source).toContain('!compact ? (');
  });
});
