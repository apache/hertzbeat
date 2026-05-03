import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('alert family cold-matte routes', () => {
  it('keeps the alert integration provider route on the HertzBeat cold source-doc shell', () => {
    const integrationSource = readFileSync(resolve(process.cwd(), 'app/alert/integration/[source]/page.tsx'), 'utf8');

    expect(integrationSource).toContain('AlertIntegrationMarkdown');
    expect(integrationSource).toContain('coldOpsCatalogVisual');
    expect(integrationSource).toContain('data-alert-integration-surface="otlp-cold-source-doc"');
    expect(integrationSource).toContain('data-alert-integration-container="cold-source-doc-shell"');
    expect(integrationSource).toContain('data-alert-integration-source-rail="cold-source-list"');
    expect(integrationSource).toContain('data-alert-integration-doc-panel="cold-markdown-doc"');
    expect(integrationSource).not.toContain('components/observability');
    expect(integrationSource).not.toContain('components/workbench/primitives');
    expect(integrationSource).not.toContain('components/observability/code-pane');
  });

  it('keeps the alert notice route on the HertzBeat notification-closure workbench shell', () => {
    const noticeSource = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');
    const noticeShellSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-console-shell.tsx'), 'utf8');

    expect(noticeSource).toContain('AlertNoticeConsoleShell');
    expect(noticeSource).toContain('coldOpsCatalogVisual');
    expect(noticeSource).toContain('data-alert-notice-surface="otlp-cold-notice-console"');
    expect(noticeSource).toContain('data-alert-notice-header="cold-compact-header"');
    expect(noticeSource).toContain('ColdConfirmDialog');
    expect(noticeShellSource).toContain('data-alert-notice-workbench-panel="cold-tabbed-table-panel"');
    expect(noticeShellSource).toContain('data-alert-notice-global-panel="cold-matte-tabbed-table"');
    expect(noticeSource).not.toContain('components/observability');
    expect(noticeSource).not.toContain('components/workbench/primitives');
  });
});
