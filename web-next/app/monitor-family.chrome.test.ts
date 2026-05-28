import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('monitor family cold-workbench chrome', () => {
  it('removes the remaining legacy white-on-black chrome from the current monitor slice', () => {
    const monitorsSource = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');
    const consoleSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
    const sectionsSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');
    const realtimeSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');
    const historySource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-history-panel.tsx'), 'utf8');

    expect(monitorsSource).not.toContain('border-white/8');
    expect(monitorsSource).not.toContain('text-white/34');
    expect(monitorsSource).not.toContain('text-white/52');
    expect(monitorsSource).not.toContain('text-white/60');
    expect(monitorsSource).not.toContain('text-white/62');

    expect(consoleSource).not.toContain('border-white/8');
    expect(consoleSource).not.toContain('#8f887d');
    expect(consoleSource).not.toContain('#f3eee6');
    expect(consoleSource).not.toContain('text-white/72');
    expect(consoleSource).not.toContain('hover:bg-white/[0.015]');

    expect(sectionsSource).not.toContain('border-white/8');
    expect(sectionsSource).not.toContain('#8f887d');
    expect(sectionsSource).not.toContain('#b5ada1');
    expect(sectionsSource).not.toContain('#f3eee6');
    expect(sectionsSource).not.toContain('hover:bg-white/[0.015]');

    expect(realtimeSource).not.toContain('border-white/8');
    expect(realtimeSource).not.toContain('#8f887d');
    expect(realtimeSource).not.toContain('#b5ada1');
    expect(realtimeSource).not.toContain('#f3eee6');

    expect(historySource).not.toContain('border-white/8');
    expect(historySource).not.toContain('#8f887d');
    expect(historySource).not.toContain('#b5ada1');
    expect(historySource).not.toContain('#f3eee6');
  });

  it('adopts shared ops tokens across the current monitor slice', () => {
    const monitorsSource = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');
    const detailRouteSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/monitor-detail-page.tsx'), 'utf8');
    const consoleSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
    const sectionsSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');
    const realtimeSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');
    const historySource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-history-panel.tsx'), 'utf8');

    expect(monitorsSource).toContain('HzExplorerFrame');
    expect(monitorsSource).toContain('HzDataTable');
    expect(monitorsSource).toContain('HzBatchToolbar');
    expect(monitorsSource).toContain('HzMonitorFilterBar');
    expect(monitorsSource).toContain('data-monitor-manage-filter-owner="hertzbeat-ui-monitor-filter-bar"');
    expect(monitorsSource).toContain('data-monitor-manage-shell-owner="hertzbeat-ui-explorer-frame"');
    expect(monitorsSource).toContain('HzStatusBadge');
    expect(monitorsSource).not.toContain('HzWorkbenchSurface');
    expect(monitorsSource).not.toContain('data-monitor-manage-detail-rail');
    expect(monitorsSource).not.toContain('SummaryMetricGrid');
    expect(monitorsSource).not.toContain('StageSection');
    expect(monitorsSource).not.toContain('DrawerSection');
    expect(monitorsSource).not.toContain('DrawerCodePreview');
    expect(monitorsSource).not.toContain('PayloadPreview density="compact" className="mt-2"');
    expect(monitorsSource).not.toContain('components/workbench/primitives');
    expect(monitorsSource).not.toContain('components/workbench/toolbar');
    expect(monitorsSource).not.toContain('components/workbench/selectable-evidence-list');
    expect(detailRouteSource).toContain('MonitorDetailConsole');
    expect(detailRouteSource).toContain('MonitorDetailSections');

    expect(consoleSource).toContain('HzMonitorDetailConsoleShell');
    expect(consoleSource).toContain('HzMonitorDetailWorkbenchFrame');
    expect(consoleSource).toContain('data-monitor-detail-console-shell-owner="hertzbeat-ui-detail-console-shell"');
    expect(consoleSource).toContain('data-monitor-workbench-stage-owner="hertzbeat-ui-detail-workbench-frame"');
    expect(consoleSource).not.toContain("from '../workbench/primitives'");

    expect(sectionsSource).toContain('HzMonitorDetailStage');
    expect(sectionsSource).toContain('HzMonitorDetailSignalList');
    expect(sectionsSource).toContain('data-monitor-detail-stage-owner="hertzbeat-ui-detail-stage"');
    expect(sectionsSource).toContain('data-monitor-detail-signal-list-owner="hertzbeat-ui-signal-list"');
    expect(sectionsSource).not.toContain('ObservabilityInsetPanel');
    expect(sectionsSource).not.toContain("from '../workbench/primitives'");

    expect(realtimeSource).toContain('HzMonitorDetailStage');
    expect(realtimeSource).toContain('HzMonitorRealtimeToolbar');
    expect(realtimeSource).toContain('data-monitor-realtime-toolbar-owner="hertzbeat-ui-realtime-toolbar"');

    expect(historySource).toContain('HzMonitorDetailStage');
    expect(historySource).toContain('HzMonitorEvidenceFrame');
    expect(historySource).toContain('data-monitor-history-stage-owner="hertzbeat-ui-detail-stage"');
    expect(historySource).toContain('data-monitor-history-chart-owner="hertzbeat-ui-echarts-panel"');
  });
});
