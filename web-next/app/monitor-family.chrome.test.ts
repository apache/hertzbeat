import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('monitor family cold-workbench chrome', () => {
  it('removes the remaining legacy white-on-black chrome from the current monitor slice', () => {
    const monitorsSource = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');
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
    const monitorsSource = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');
    const detailRouteSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/page.tsx'), 'utf8');
    const consoleSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
    const sectionsSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-sections.tsx'), 'utf8');
    const realtimeSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-realtime-panel.tsx'), 'utf8');
    const historySource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-history-panel.tsx'), 'utf8');

    expect(monitorsSource).toContain('border-[var(--ops-border-color)]');
    expect(monitorsSource).toContain('text-[var(--ops-text-secondary)]');
    expect(monitorsSource).toContain('text-[var(--ops-text-tertiary)]');
    expect(monitorsSource).toContain('SummaryMetricGrid');
    expect(monitorsSource).toContain('StageSection');
    expect(monitorsSource).toContain("title={t('monitors.section.list.title')}");
    expect(monitorsSource).toContain("DrawerSection title={t('monitors.rail.selected')}");
    expect(monitorsSource).toContain("DrawerSection title={t('monitors.rail.labels')}");
    expect(monitorsSource).toContain("DrawerSection title={t('monitors.rail.controls')}");
    expect(monitorsSource).toContain('DrawerCodePreview');
    expect(monitorsSource).toContain('ObservabilityStatusState');
    expect(monitorsSource).not.toContain('PayloadPreview density="compact" className="mt-2"');
    expect(monitorsSource).not.toContain('components/workbench/primitives');
    expect(monitorsSource).not.toContain('components/workbench/toolbar');
    expect(monitorsSource).not.toContain('components/workbench/selectable-evidence-list');
    expect(detailRouteSource).toContain('MonitorDetailConsole');
    expect(detailRouteSource).toContain('MonitorDetailSections');

    expect(consoleSource).toContain('border-[var(--ops-border-color)]');
    expect(consoleSource).toContain('text-[var(--ops-text-primary)]');
    expect(consoleSource).toContain('text-[var(--ops-text-secondary)]');
    expect(consoleSource).toContain('text-[var(--ops-text-tertiary)]');
    expect(consoleSource).toContain('ObservabilityControlChip');
    expect(consoleSource).toContain('ObservabilityPillButton');
    expect(consoleSource).toContain('ObservabilityBadge');
    expect(consoleSource).not.toContain("from '../workbench/primitives'");

    expect(sectionsSource).toContain('border-[var(--ops-border-color)]');
    expect(sectionsSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(sectionsSource).toContain('text-[var(--ops-text-secondary)]');
    expect(sectionsSource).toContain('ObservabilityControlChip');
    expect(sectionsSource).toContain('ObservabilityBadge');
    expect(sectionsSource).not.toContain('ObservabilityInsetPanel');
    expect(sectionsSource).not.toContain("from '../workbench/primitives'");

    expect(realtimeSource).toContain('border-[var(--ops-border-color)]');
    expect(realtimeSource).toContain('bg-[var(--ops-surface-panel)]');
    expect(realtimeSource).toContain('text-[var(--ops-text-secondary)]');

    expect(historySource).toContain('border-[var(--ops-border-color)]');
    expect(historySource).toContain('bg-[var(--ops-surface-panel)]');
    expect(historySource).toContain('text-[var(--ops-text-secondary)]');
  });
});
