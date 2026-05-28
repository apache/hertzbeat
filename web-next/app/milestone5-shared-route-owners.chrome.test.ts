import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = resolve(process.cwd(), 'app');
const FORBIDDEN_ROUTE_TOKENS = [
  'components/workbench/primitives',
  'SurfaceSection',
  'RailSection',
  'WorkbenchPanel',
  'ObservabilityPanelShell',
  'ObservabilityRailShell'
];

function collectNonTestAppFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const entryPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectNonTestAppFiles(entryPath);
    }

    if (!entry.isFile()) {
      return [];
    }

    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) {
      return [];
    }

    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
      return [];
    }

    return [entryPath];
  });
}

describe('Milestone 5 shared route owners', () => {
  it('keeps representative route entrypoints pinned to shared observability owners', () => {
    const overviewSource = readFileSync(resolve(process.cwd(), 'app/overview/overview-page.tsx'), 'utf8');
    const monitorsSource = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');
    const logSource = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const traceSource = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');
    const alertIntegrationSource = readFileSync(resolve(process.cwd(), 'app/alert/integration/[source]/page.tsx'), 'utf8');
    const alertNoticeSource = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const statusSource = readFileSync(resolve(process.cwd(), 'app/status/status-page.tsx'), 'utf8');
    const passportSource = readFileSync(resolve(process.cwd(), 'app/passport/login/page.tsx'), 'utf8');

    expect(overviewSource).toContain('StageSection');
    expect(overviewSource).toContain('SupportPanel');
    expect(overviewSource).not.toContain('components/workbench/primitives');

    expect(monitorsSource).toContain('HzExplorerFrame');
    expect(monitorsSource).toContain('HzDataTable');
    expect(monitorsSource).toContain('data-monitor-manage-shell-owner="hertzbeat-ui-explorer-frame"');
    expect(monitorsSource).not.toContain('StageSection');
    expect(monitorsSource).not.toContain('SummaryMetricGrid');
    expect(monitorsSource).not.toContain('DrawerSection');
    expect(monitorsSource).not.toContain('components/workbench/primitives');

    expect(logSource).toContain('ClientWorkbench');
    expect(logSource).toContain('TimeRangeControl');
    expect(logSource).toContain('data-log-manage-time-control="shared-time-context-control"');
    expect(logSource).not.toContain('components/workbench/primitives');

    expect(traceSource).toContain('ClientWorkbench');
    expect(traceSource).toContain('TimeRangeControl');
    expect(traceSource).toContain('ObservabilityWaterfall');
    expect(traceSource).toContain('data-trace-manage-time-control="shared-time-context-control"');
    expect(traceSource).not.toContain('components/workbench/primitives');

    expect(alertIntegrationSource).toContain('AlertIntegrationMarkdown');
    expect(alertIntegrationSource).toContain('coldOpsCatalogVisual');
    expect(alertIntegrationSource).toContain('data-alert-integration-surface="otlp-cold-source-doc"');
    expect(alertIntegrationSource).not.toContain('components/workbench/primitives');

    expect(alertNoticeSource).toContain('AlertNoticeConsoleShell');
    expect(alertNoticeSource).toContain('ClientWorkbench');
    expect(alertNoticeSource).toContain('HzConfirmDialog');
    expect(alertNoticeSource).toContain('data-alert-notice-surface="otlp-cold-notice-console"');
    expect(alertNoticeSource).not.toContain('components/workbench/primitives');

    expect(statusSource).toContain('PublicStatusShell');
    expect(passportSource).toContain('LoginForm');
  });

  it('keeps every non-test app route file free of deprecated visual ownership tokens', () => {
    const appFiles = collectNonTestAppFiles(APP_ROOT);
    const offenders = appFiles.flatMap(filePath => {
      const source = readFileSync(filePath, 'utf8');
      const relativePath = filePath.replace(`${APP_ROOT}/`, 'app/');

      return FORBIDDEN_ROUTE_TOKENS.filter(token => source.includes(token)).map(token => `${relativePath} -> ${token}`);
    });

    expect(offenders).toEqual([]);
  });
});
