import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('log dialog shared chrome', () => {
  it('removes the legacy white-on-black chrome from shared log dialog and row-list owners', () => {
    const workbenchPageSource = readFileSync(resolve(process.cwd(), 'components/workbench/workbench-page.tsx'), 'utf8');
    const streamDialogSource = readFileSync(resolve(process.cwd(), 'components/log-manage/log-stream-detail-dialog.tsx'), 'utf8');
    const relatedTraceDialogSource = readFileSync(resolve(process.cwd(), 'components/log-manage/log-related-trace-dialog.tsx'), 'utf8');

    expect(workbenchPageSource).not.toContain('divide-white/6');
    expect(workbenchPageSource).not.toContain('text-white/62');
    expect(workbenchPageSource).not.toContain('text-white/30');
    expect(streamDialogSource).not.toContain('border-white/8');
    expect(streamDialogSource).not.toContain('#f3eee6');
    expect(streamDialogSource).not.toContain('text-white/48');
    expect(relatedTraceDialogSource).not.toContain('border-white/8');
    expect(relatedTraceDialogSource).not.toContain('bg-white/[0.03]');
    expect(relatedTraceDialogSource).not.toContain('text-white/45');
  });

  it('adopts shared ops tokens across shared log dialog and row-list owners', () => {
    const workbenchPageSource = readFileSync(resolve(process.cwd(), 'components/workbench/workbench-page.tsx'), 'utf8');
    const streamDialogSource = readFileSync(resolve(process.cwd(), 'components/log-manage/log-stream-detail-dialog.tsx'), 'utf8');
    const relatedTraceDialogSource = readFileSync(resolve(process.cwd(), 'components/log-manage/log-related-trace-dialog.tsx'), 'utf8');
    const logManagePageSource = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(workbenchPageSource).toContain('divide-[var(--ops-border-color)]');
    expect(workbenchPageSource).toContain('text-[var(--ops-text-primary)]');
    expect(workbenchPageSource).toContain('text-[var(--ops-text-secondary)]');
    expect(streamDialogSource).toContain('HzDialogBodyLayout');
    expect(streamDialogSource).toContain('HzDetailRows');
    expect(streamDialogSource).toContain('HzAttributeDiagnostics');
    expect(streamDialogSource).toContain("t('log.manage.stream.detail.attribution-title')");
    expect(streamDialogSource).toContain("t('log.manage.stream.detail.attribution-present')");
    expect(streamDialogSource).toContain("t('log.manage.stream.detail.attribution-missing')");
    expect(streamDialogSource).toContain('data-log-stream-detail-trace-id');
    expect(streamDialogSource).toContain('data-log-stream-detail-selection');
    expect(streamDialogSource).not.toMatch(/\u5f52\u56e0\u8bca\u65ad/);
    expect(streamDialogSource).not.toMatch(/\u5df2\u63d0\u4f9b/);
    expect(streamDialogSource).not.toMatch(/\u7f3a\u5931/);
    expect(relatedTraceDialogSource).toContain('HzDialogBodyLayout');
    expect(relatedTraceDialogSource).toContain('HzStateNotice');
    expect(relatedTraceDialogSource).toContain('HzStatStrip');
    expect(relatedTraceDialogSource).toContain("t('log.manage.related-trace.kicker')");
    expect(relatedTraceDialogSource).toContain("t('log.manage.related-trace.event-detail.title')");
    expect(relatedTraceDialogSource).toContain("t('log.manage.related-trace.event-detail.action.span')");
    expect(relatedTraceDialogSource).not.toMatch(/\u76f8\u5173\u94fe\u8def/);
    expect(relatedTraceDialogSource).not.toMatch(/\u8de8\u5ea6\u4e8b\u4ef6/);
    expect(relatedTraceDialogSource).not.toMatch(/\u4e8b\u4ef6\u8be6\u60c5/);
    expect(relatedTraceDialogSource).not.toMatch(/\u67e5\u770b\u8de8\u5ea6/);
    expect(logManagePageSource).toContain('data-log-manage-stream-trace-id');
    expect(logManagePageSource).toContain('data-log-manage-stream-selected');
  });
});
