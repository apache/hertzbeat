import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceFiles = [
  'components/pages/three-signal-desk-shell.tsx',
  'components/overview/overview-console.tsx',
  'components/workbench/primitives.tsx',
  'app/overview/overview-page.tsx',
  'app/log/manage/log-manage-page.tsx',
  'app/trace/manage/trace-manage-page.tsx',
  'app/ingestion/otlp/otlp-page.tsx',
  'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'
];

describe('three-signal family cold-workbench chrome', () => {
  it('removes the legacy gradient-card shell remnants from the route family', () => {
    for (const file of sourceFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');

      expect(source, `${file} should not keep the old rounded-18 desk shell`).not.toContain('rounded-[18px]');
      expect(source, `${file} should not keep the old gradient shell`).not.toContain('linear-gradient(180deg,rgba(11,16,24,.96),rgba(7,10,16,.98))');
    }
  });

  it('adopts shared workbench owners across the exactness-sensitive three-signal family', () => {
    const shellSource = readFileSync(resolve(process.cwd(), 'components/pages/three-signal-desk-shell.tsx'), 'utf8');
    const overviewSource = readFileSync(resolve(process.cwd(), 'app/overview/overview-page.tsx'), 'utf8');
    const logSource = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const traceSource = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');
    const metricsSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'), 'utf8');

    expect(shellSource).toContain("../observability/workspace-shell");
    expect(shellSource).not.toContain("../workbench/workspace-shell");
    expect(shellSource).toContain("bg-[var(--ops-surface-panel)] p-3");
    expect(shellSource).toContain("bg-[var(--ops-surface-elevated)] p-3");
    expect(overviewSource).toContain('components/observability');
    expect(overviewSource).toContain('StageSection');
    expect(overviewSource).toContain('SupportPanel');
    expect(overviewSource).not.toContain('components/workbench/primitives');
    expect(logSource).toContain('components/observability/time-range-control');
    expect(logSource).toContain('data-log-manage-time-toolbar="top-right-corner"');
    expect(logSource).toContain('data-log-manage-time-control-visual="narrow-top-right-rail"');
    expect(logSource).toContain('data-log-manage-time-control-fit="no-clipping"');
    expect(logSource).toContain('variant="narrow-rail"');
    expect(logSource).toContain('showAbsoluteFields');
    expect(logSource.indexOf('data-log-manage-time-control="shared-time-context-control"')).toBeLessThan(
      logSource.indexOf('data-log-manage-query-bar="cold-query-row"')
    );
    expect(logSource).not.toContain('components/workbench/primitives');
    expect(logSource).not.toContain('ObservabilityPanelShell');
    expect(logSource).not.toContain('ObservabilityRailShell');
    expect(logSource).not.toContain('denseSurfaceClass');
    expect(logSource).not.toContain('denseRailClass');
    expect(traceSource).toContain('components/observability/time-range-control');
    expect(traceSource).toContain('data-trace-manage-time-toolbar="top-right-corner"');
    expect(traceSource).toContain('data-trace-manage-time-control-visual="narrow-top-right-rail"');
    expect(traceSource).toContain('data-trace-manage-time-control-fit="no-clipping"');
    expect(traceSource).toContain('variant="narrow-rail"');
    expect(traceSource).toContain('showAbsoluteFields');
    expect(traceSource.indexOf('data-trace-manage-time-control="shared-time-context-control"')).toBeLessThan(
      traceSource.indexOf('data-trace-manage-query-bar="cold-query-row"')
    );
    expect(traceSource).not.toContain('components/workbench/primitives');
    expect(metricsSource).toContain('components/observability/time-range-control');
    expect(metricsSource).toContain('data-otlp-metrics-time-toolbar="top-right-corner"');
    expect(metricsSource).toContain('data-otlp-metrics-time-control-visual="narrow-top-right-rail"');
    expect(metricsSource).toContain('data-otlp-metrics-time-control-fit="no-clipping"');
    expect(metricsSource).toContain('variant="narrow-rail"');
    expect(metricsSource).toContain('showAbsoluteFields');
    expect(metricsSource.indexOf('data-otlp-metrics-time-control="shared-time-context-control"')).toBeLessThan(
      metricsSource.indexOf('data-otlp-metrics-query-bar="cold-query-row"')
    );
    expect(metricsSource).not.toContain('components/workbench/primitives');
  });

  it('removes the remaining legacy white-on-black chrome from the three-signal family', () => {
    const overviewSource = readFileSync(resolve(process.cwd(), 'app/overview/overview-page.tsx'), 'utf8');
    const logSource = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const traceSource = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');
    const otlpSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/otlp-page.tsx'), 'utf8');
    const metricsSource = readFileSync(resolve(process.cwd(), 'app/ingestion/otlp/metrics/otlp-metrics-page.tsx'), 'utf8');

    expect(overviewSource).not.toContain('text-white/44');
    expect(overviewSource).not.toContain('#f3eee6');
    expect(logSource).not.toContain('border-white/8');
    expect(logSource).not.toContain('bg-[linear-gradient(180deg,rgba(14,19,28,.96),rgba(8,12,18,.94))]');
    expect(logSource).not.toContain('bg-[rgba(255,184,77,.08)]');
    expect(logSource).not.toContain('bg-[rgba(14,20,28,.92)]');
    expect(logSource).not.toContain('group w-full rounded-[12px] border px-3 py-2 text-left transition duration-150');
    expect(traceSource).not.toContain('border-white/8');
    expect(traceSource).not.toContain('rounded-[16px]');
    expect(otlpSource).not.toContain('border-white/10');
    expect(metricsSource).not.toContain('bg-black/15');
    expect(metricsSource).not.toContain('text-white');
  });
});
