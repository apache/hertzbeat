import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('alert family cold-matte routes', () => {
  it('keeps the alert integration provider route on the HertzBeat cold source-doc shell', () => {
    const integrationSource = readFileSync(resolve(process.cwd(), 'app/alert/integration/[source]/page.tsx'), 'utf8');
    const sourceDocShellSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/source-doc-shell.tsx'), 'utf8');

    expect(integrationSource).toContain('AlertIntegrationMarkdown');
    expect(integrationSource).toContain('HzSourceDocShell');
    expect(integrationSource).toContain('data-alert-integration-surface="hertzbeat-ui-source-doc"');
    expect(integrationSource).toContain('data-alert-integration-shell-owner="hertzbeat-ui-source-doc-shell"');
    expect(sourceDocShellSource).toContain('data-hz-source-doc-rail-owner="hertzbeat-ui-source-doc-shell"');
    expect(sourceDocShellSource).toContain('data-hz-source-doc-panel-owner="hertzbeat-ui-source-doc-shell"');
    expect(integrationSource).not.toContain('components/observability');
    expect(integrationSource).not.toContain('components/workbench/primitives');
    expect(integrationSource).not.toContain('components/observability/code-pane');
  });

  it('keeps the alert notice route on the HertzBeat notification-closure workbench shell', () => {
    const noticeSource = readFileSync(resolve(process.cwd(), 'app/alert/notice/page.tsx'), 'utf8');
    const noticePageSource = readFileSync(resolve(process.cwd(), 'app/alert/notice/alert-notice-page.tsx'), 'utf8');
    const noticeShellSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-console-shell.tsx'), 'utf8');

    expect(noticeSource).toContain('AlertNoticePage');
    expect(noticePageSource).toContain('AlertNoticeConsoleShell');
    expect(noticePageSource).toContain('hzOpsCatalogVisual');
    expect(noticePageSource).toContain('data-alert-notice-surface="otlp-hertzbeat-ui-notice-console"');
    expect(noticePageSource).toContain('data-alert-notice-header="hertzbeat-ui-compact-header"');
    expect(noticePageSource).toContain('HzConfirmDialog');
    expect(noticeShellSource).toContain('data-alert-notice-workbench-panel="hertzbeat-ui-tabbed-table-panel"');
    expect(noticeShellSource).toContain('data-alert-notice-global-panel="hertzbeat-ui-matte-tabbed-table"');
    expect(noticeSource).not.toContain('components/observability');
    expect(noticeSource).not.toContain('components/workbench/primitives');
  });
});
