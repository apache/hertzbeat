import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MonitorHistoryPanel } from './monitor-history-panel';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();

const payload = {
  values: {
    'host=db-1': [
      { mean: '15', min: '10', max: '20', time: 1 },
      { mean: '25', min: '22', max: '29', time: 2 }
    ]
  }
} as any;

describe('monitor history panel', () => {
  it('does not expose a dataZoom slider on the legacy detail panel because it cannot apply zoom as query time', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-history-panel.tsx'), 'utf8');

    expect(source).toContain('enableDataZoom: false');
    expect(source).not.toContain('preserveDataZoom');
    expect(source).not.toContain('onDataZoomChange');
  });

  it('renders fullscreen trigger and history investigation sections', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={payload}
        selectedSeriesKey="host=db-1"
        selectedPointIndex={1}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-1']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    expect(html).toContain('Fullscreen');
    expect(html).toContain('30m');
    expect(html).toContain('1h');
    expect(html).toContain('Raw');
    expect(html).toContain('Aggregated');
    expect(html).toContain('Latest point');
    expect(html).toContain('Refresh');
    expect(html).toContain('Primary only');
    expect(html).toContain('Show all stats');
    expect(html).toContain('Latest value');
    expect(html).toContain('Delta');
    expect(html).toContain('Range');
    expect(html).toContain('Point samples');
    expect(html).toContain('selected point');
    expect(html).toContain('Series');
    expect(html).toContain('Point');
    expect(html).toContain('Series samples');
    expect(html).toContain('Mean');
    expect(html).toContain('selected · min 22 · max 29 · t2');
    expect(html).toContain('Series 1 / 1');
    expect(html).toContain('Point 2 / 2');
    expect(html).toContain('Previous series');
    expect(html).toContain('Next series');
    expect(html).toContain('Previous point');
    expect(html).toContain('Next point');
    expect(html).toContain('History chart');
    expect(html).toContain('Selected series');
    expect(html).not.toContain('Metric timeline canvas');
    expect(html).not.toContain('Series compare lane');
    expect(html).toMatch(/data-monitor-surface=\"history-stage\"/);
    expect(html).toMatch(/data-monitor-surface-panel=\"series-compare\"/);
  });

  it('disables series navigation at the current boundaries', () => {
    const historyPayload = {
      values: {
        'host=db-1': [
          { mean: '15', min: '10', max: '20', time: 1 },
          { mean: '25', min: '22', max: '29', time: 2 }
        ],
        'host=db-2': [
          { mean: '18', min: '12', max: '24', time: 1 },
          { mean: '28', min: '24', max: '31', time: 2 }
        ]
      }
    } as any;

    const firstSeriesHtml = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={historyPayload}
        selectedSeriesKey="host=db-1"
        selectedPointIndex={1}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-1', 'host=db-2']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    const lastSeriesHtml = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={historyPayload}
        selectedSeriesKey="host=db-2"
        selectedPointIndex={1}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-1', 'host=db-2']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    expect(firstSeriesHtml).toMatch(/<button[^>]*disabled=""[^>]*>Previous series<\/button>/);
    expect(firstSeriesHtml).not.toMatch(/<button[^>]*disabled=""[^>]*>Next series<\/button>/);
    expect(lastSeriesHtml).not.toMatch(/<button[^>]*disabled=""[^>]*>Previous series<\/button>/);
    expect(lastSeriesHtml).toMatch(/<button[^>]*disabled=""[^>]*>Next series<\/button>/);
  });

  it('renders an in-panel series switcher with latest evidence for neighboring series', () => {
    const historyPayload = {
      values: {
        'host=db-1': [
          { mean: '15', min: '10', max: '20', time: 1 },
          { mean: '25', min: '22', max: '29', time: 2 }
        ],
        'host=db-2': [
          { mean: '18', min: '12', max: '24', time: 1 },
          { mean: '28', min: '24', max: '31', time: 2 }
        ],
        'host=db-3': [
          { mean: '21', min: '18', max: '27', time: 1 },
          { mean: '32', min: '30', max: '35', time: 2 }
        ]
      }
    } as any;

    const html = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={historyPayload}
        selectedSeriesKey="host=db-2"
        selectedPointIndex={1}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-1', 'host=db-2', 'host=db-3']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    expect(html).toContain('Series samples');
    expect(html).toContain('host=db-1');
    expect(html).toContain('host=db-2');
    expect(html).toContain('host=db-3');
    expect(html).toContain('Compare set');
    expect(html).toContain('Only selected');
    expect(html).toContain('Show all');
    expect(html).toContain('min 24 · max 31 · t2');
    expect(html).toContain('selected · min 24 · max 31 · t2');
    expect(html).toMatch(/<button[^>]*data-series-selected="true"[^>]*>[\s\S]*host=db-2/);
    expect(html).toMatch(/<button[^>]*(data-compare-selected="true"[^>]*disabled=""|disabled=""[^>]*data-compare-selected="true")[^>]*>[\s\S]*host=db-2/);
    expect(html).toMatch(/<button[^>]*data-compare-row-selected="true"[^>]*>[\s\S]*host=db-2/);
    expect(html).toMatch(/<button[^>]*data-compare-row-selected="false"[^>]*>[\s\S]*host=db-1/);
  });

  it('limits compare rows to the currently visible series keys', () => {
    const historyPayload = {
      values: {
        'host=db-1': [
          { mean: '15', min: '10', max: '20', time: 1 },
          { mean: '25', min: '22', max: '29', time: 2 }
        ],
        'host=db-2': [
          { mean: '18', min: '12', max: '24', time: 1 },
          { mean: '28', min: '24', max: '31', time: 2 }
        ]
      }
    } as any;

    const html = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={historyPayload}
        selectedSeriesKey="host=db-1"
        selectedPointIndex={1}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-1', 'host=db-2']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    expect(html).toContain('Compare set');
    expect(html).toContain('Only selected');
    expect(html).toContain('Show all');
    expect(html).toContain('selected · min 22 · max 29 · t2');
    expect(html).toContain('min 24 · max 31 · t2');
    expect(html).toContain('selected point');
  });

  it('keeps series navigation aligned with the filtered visible series set', () => {
    const historyPayload = {
      values: {
        'host=db-1': [
          { mean: '15', min: '10', max: '20', time: 1 },
          { mean: '25', min: '22', max: '29', time: 2 }
        ],
        'host=db-2': [
          { mean: '18', min: '12', max: '24', time: 1 },
          { mean: '28', min: '24', max: '31', time: 2 }
        ]
      }
    } as any;

    const html = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={historyPayload}
        selectedSeriesKey="host=db-2"
        selectedPointIndex={1}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-2']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    expect(html).toContain('Series 1 / 1');
    expect(html).not.toContain('host=db-1');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Previous series<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Next series<\/button>/);
  });

  it('falls back to the first visible series when the previously selected series is filtered out', () => {
    const historyPayload = {
      values: {
        'host=db-1': [
          { mean: '15', min: '10', max: '20', time: 1 },
          { mean: '25', min: '22', max: '29', time: 2 }
        ],
        'host=db-2': [
          { mean: '18', min: '12', max: '24', time: 1 },
          { mean: '28', min: '24', max: '31', time: 2 }
        ]
      }
    } as any;

    const html = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={historyPayload}
        selectedSeriesKey="host=db-1"
        selectedPointIndex={1}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-2']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    expect(html).toContain('host=db-2');
    expect(html).toContain('selected · min 24 · max 31 · t2');
    expect(html).toContain('Series 1 / 1');
    expect(html).not.toContain('Awaiting series');
    expect(html).toMatch(/data-series-selected="true"[^>]*>[\s\S]*host=db-2/);
    expect(html).toMatch(/data-compare-row-selected="true"[^>]*>[\s\S]*host=db-2/);
  });

  it('shows a neutral delta when the latest chart sample is missing', () => {
    const sparsePayload = {
      values: {
        'host=db-1': [
          { mean: '15', min: '10', max: '20', time: 1 },
          { mean: undefined, min: undefined, max: undefined, time: 2 }
        ]
      }
    } as any;

    const html = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={sparsePayload}
        selectedSeriesKey="host=db-1"
        selectedPointIndex={1}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-1']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    expect(html).toMatch(/Delta<\/div><div[^>]*>-<\/div>/);
  });

  it('renders expanded history shell', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={payload}
        selectedSeriesKey="host=db-1"
        selectedPointIndex={0}
        aggregated
        historyWindow="6h"
        historyWindows={[
          { value: '1h', label: '1h' },
          { value: '6h', label: '6h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-1']}
        expanded
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );
    const modalHtml = html.split('data-expanded="true"')[1] ?? '';

    expect(html).toContain('data-expanded="true"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Exit fullscreen');
    expect(html).toContain('History detail');
    expect(html).toContain('host=db-1');
    expect(html).toContain('6h');
    expect(html).toContain('Latest point');
    expect(html).toContain('Refresh');
    expect(html).toContain('Primary only');
    expect(html).toContain('Show all stats');
    expect(modalHtml).not.toMatch(/>Fullscreen<\/button>/);
  });

  it('explains when the history route is wired but the store has not returned samples yet', () => {
    const html = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={{ values: {} } as any}
        selectedSeriesKey={null}
        selectedPointIndex={null}
        aggregated={false}
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={[]}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    expect(html).toContain('History not ready');
    expect(html).toContain('History store has not returned series yet.');
  });

  it('disables point navigation at the current boundaries', () => {
    const firstPointHtml = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={payload}
        selectedSeriesKey="host=db-1"
        selectedPointIndex={0}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-1']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    const lastPointHtml = renderToStaticMarkup(
      <MonitorHistoryPanel
        payload={payload}
        selectedSeriesKey="host=db-1"
        selectedPointIndex={1}
        aggregated
        historyWindow="1h"
        historyWindows={[
          { value: '30m', label: '30m' },
          { value: '1h', label: '1h' }
        ]}
        historyModes={[
          { value: false, label: 'Raw' },
          { value: true, label: 'Aggregated' }
        ]}
        visibleSeriesKeys={['host=db-1']}
        expanded={false}
        onSelectSeries={() => {}}
        onSelectPoint={() => {}}
        onRefresh={() => {}}
        onSetHistoryWindow={() => {}}
        onSetHistoryMode={() => {}}
        onToggleExpanded={() => {}}
        formatTime={value => `t${value}`}
        t={t}
      />
    );

    expect(firstPointHtml).toMatch(/<button[^>]*disabled=""[^>]*>Previous point<\/button>/);
    expect(firstPointHtml).not.toMatch(/<button[^>]*disabled=""[^>]*>Next point<\/button>/);
    expect(lastPointHtml).not.toMatch(/<button[^>]*disabled=""[^>]*>Previous point<\/button>/);
    expect(lastPointHtml).toMatch(/<button[^>]*disabled=""[^>]*>Next point<\/button>/);
  });

  it('routes the fullscreen shell through the shared workbench fullscreen owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-history-panel.tsx'), 'utf8');

    expect(source).toContain('WorkbenchFullscreenShell');
    expect(source).not.toContain('hb-scrollbar max-h-[92vh] w-full max-w-6xl overflow-auto rounded-[6px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]');
  });
});
