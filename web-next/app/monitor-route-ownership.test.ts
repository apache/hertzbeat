import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('monitor route ownership posture', () => {
  it('keeps monitor list/detail/create/edit handoffs on shared navigation owners', () => {
    const listSource = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');
    const detailSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/page.tsx'), 'utf8');
    const newSource = readFileSync(resolve(process.cwd(), 'app/monitors/new/page.tsx'), 'utf8');
    const editSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/edit/page.tsx'), 'utf8');
    const editorSurfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');

    expect(listSource).toContain('buildMonitorDetailHref');
    expect(listSource).toContain('buildMonitorEditHref');
    expect(listSource).toContain('buildMonitorNewHref');

    expect(detailSource).toContain("from '@/lib/monitor-manage/navigation'");
    expect(detailSource).toContain('buildMonitorListReturnHref');
    expect(detailSource).toContain('buildMonitorEditHref');
    expect(detailSource).not.toContain("from '@/lib/monitor-editor/navigation'");
    expect(detailSource).not.toContain('buildMonitorEditorReturnUrl');

    expect(newSource).toContain('returnContext={{');
    expect(newSource).toContain("labels: searchParams.get('labels')");
    expect(newSource).toContain("pageIndex: searchParams.get('pageIndex')");
    expect(newSource).toContain("pageSize: searchParams.get('pageSize')");
    expect(newSource).toContain("entityId: searchParams.get('entityId')");
    expect(newSource).toContain("entityName: searchParams.get('entityName')");
    expect(newSource).not.toContain("returnLabel: searchParams.get('returnLabel')");
    expect(editSource).toContain('returnContext={{');
    expect(editSource).toContain("labels: searchParams.get('labels')");
    expect(editSource).toContain("pageIndex: searchParams.get('pageIndex')");
    expect(editSource).toContain("pageSize: searchParams.get('pageSize')");
    expect(editSource).toContain("entityId: searchParams.get('entityId')");
    expect(editSource).toContain("entityName: searchParams.get('entityName')");
    expect(editSource).not.toContain("returnLabel: searchParams.get('returnLabel')");

    expect(editorSurfaceSource).toContain('returnContext?:');
    expect(editorSurfaceSource).toContain('...returnContext');
    expect(editorSurfaceSource).not.toContain('buildMonitorEditorReturnUrl(nextDraft.monitor.app, returnTo)');
    expect(editorSurfaceSource).not.toContain('buildMonitorEditorReturnUrl(draft.monitor.app, returnTo)');
  });

  it('keeps monitor route state machine-only without display-label fields', () => {
    const queryStateSource = readFileSync(resolve(process.cwd(), 'lib/monitor-manage/query-state.ts'), 'utf8');
    const navigationSource = readFileSync(resolve(process.cwd(), 'lib/monitor-manage/navigation.ts'), 'utf8');

    expect(queryStateSource).not.toContain('returnLabel: string');
    expect(queryStateSource).not.toContain("returnLabel: ''");
    expect(navigationSource).not.toContain('returnLabel?: string');
    expect(navigationSource).not.toContain('returnLabel?: string | null');
  });

  it('keeps monitor page test doubles from reintroducing display-label route fields', () => {
    const pageTestSource = readFileSync(resolve(process.cwd(), 'app/monitors/page.test.tsx'), 'utf8');

    expect(pageTestSource).not.toContain("returnLabel: mockState.searchParams.get('returnLabel')");
    expect(pageTestSource).not.toContain("returnLabel: ''");
    expect(pageTestSource).not.toContain("returnUrl.searchParams.delete('returnLabel')");
  });
});
