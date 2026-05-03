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
    const overviewSource = readFileSync(resolve(process.cwd(), 'app/overview/page.tsx'), 'utf8');
    const monitorsSource = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');
    const logSource = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const traceSource = readFileSync(resolve(process.cwd(), 'app/trace/manage/page.tsx'), 'utf8');
    const alertIntegrationSource = readFileSync(resolve(process.cwd(), 'app/alert/integration/[source]/page.tsx'), 'utf8');
    const alertNoticeSource = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');
    const statusSource = readFileSync(resolve(process.cwd(), 'app/status/page.tsx'), 'utf8');
    const passportSource = readFileSync(resolve(process.cwd(), 'app/passport/login/page.tsx'), 'utf8');

    expect(overviewSource).toContain('StageSection');
    expect(overviewSource).toContain('SupportPanel');
    expect(overviewSource).not.toContain('components/workbench/primitives');

    expect(monitorsSource).toContain('StageSection');
    expect(monitorsSource).toContain('SummaryMetricGrid');
    expect(monitorsSource).toContain('DrawerSection');
    expect(monitorsSource).not.toContain('components/workbench/primitives');

    expect(logSource).toContain('FactsStrip');
    expect(logSource).toContain('StageSection');
    expect(logSource).toContain('DrawerSection');
    expect(logSource).toContain('DrawerCodePreview');
    expect(logSource).not.toContain('components/workbench/primitives');

    expect(traceSource).toContain('FactsStrip');
    expect(traceSource).toContain('StageSection');
    expect(traceSource).toContain('DrawerSection');
    expect(traceSource).toContain('DrawerCodePreview');
    expect(traceSource).not.toContain('components/workbench/primitives');

    expect(alertIntegrationSource).toContain('StageSection');
    expect(alertIntegrationSource).toContain('DrawerSection');
    expect(alertIntegrationSource).toContain('DrawerCodePreview');
    expect(alertIntegrationSource).not.toContain('components/workbench/primitives');

    expect(alertNoticeSource).toContain('StageSection');
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
