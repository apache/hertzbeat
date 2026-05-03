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
    expect(streamDialogSource).toContain('border-[var(--ops-border-color)]');
    expect(streamDialogSource).toContain('text-[var(--ops-text-primary)]');
    expect(streamDialogSource).toContain('text-[var(--ops-text-secondary)]');
    expect(streamDialogSource).toContain('data-log-stream-detail-trace-id');
    expect(streamDialogSource).toContain('data-log-stream-detail-selection');
    expect(relatedTraceDialogSource).toContain('border-[var(--ops-border-color)]');
    expect(relatedTraceDialogSource).toContain('text-[var(--ops-text-primary)]');
    expect(relatedTraceDialogSource).toContain('text-[var(--ops-text-tertiary)]');
    expect(logManagePageSource).toContain('data-log-manage-stream-trace-id');
    expect(logManagePageSource).toContain('data-log-manage-stream-selected');
  });
});
