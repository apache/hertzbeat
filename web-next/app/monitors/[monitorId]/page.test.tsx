import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/page.tsx'), 'utf8');

describe('MonitorDetailPage route contract', () => {
  it('routes monitor detail through the shared HertzBeat console and section owner', () => {
    expect(source).toContain('MonitorDetailConsole');
    expect(source).toContain('MonitorDetailSections');
    expect(source).toContain('loadMonitorDetailBundle');
    expect(source).not.toContain('buildMonitorWorkbenchSummaryFacts');
    expect(source).not.toContain("const historyChartSummaryCount = currentTab === 'history' ? historyMetrics.length : 0;");
    expect(source).toContain('historyChartPayloads');
    expect(source).toContain('historyChartLoadingKeys');
    expect(source).toContain('historyChartErrors');
    expect(source).toContain('filterMonitorHistoryMetricCatalog(historyMetrics, historyMetricSearch).slice(0, 6)');
    expect(source).toContain('start: historyTimeContext.start');
    expect(source).toContain('end: historyTimeContext.end');
    expect(source).toContain('onApplyHistoryChartZoomTimeRange: handleApplyHistoryTimeContext');
    expect(source).toContain('historyChartPayloads,');
    expect(source).not.toContain('workbenchSummaryFacts={workbenchSummaryFacts}');
    expect(source).toContain('editHref,');
    expect(source).not.toContain('buildMonitorDetailFacts(monitor');
  });

  it('does not reintroduce the old pre-tab context card stack at route level', () => {
    expect(source).not.toContain('contextContent=');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('WorkbenchPanel');
  });

  it('passes monitor signal handoff links from route state into the compact console toolbar', () => {
    expect(source).toContain('buildMonitorSignalHandoffLinks');
    expect(source).toContain('const signalHandoffLinks = buildMonitorSignalHandoffLinks(');
    expect(source).toContain('signalHandoffLinks={signalHandoffLinks}');
    expect(source).not.toContain('data-monitor-signal-fake-card');
    expect(source).not.toContain('data-monitor-signal-fake-count');
  });
});
