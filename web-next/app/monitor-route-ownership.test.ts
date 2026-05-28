import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('monitor route ownership posture', () => {
  it('keeps monitor list/detail/create/edit handoffs on shared navigation owners', () => {
    const listRouteSource = readFileSync(resolve(process.cwd(), 'app/monitors/page.tsx'), 'utf8');
    const listSource = readFileSync(resolve(process.cwd(), 'app/monitors/monitor-manage-page.tsx'), 'utf8');
    const detailSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/monitor-detail-page.tsx'), 'utf8');
    const newRouteSource = readFileSync(resolve(process.cwd(), 'app/monitors/new/page.tsx'), 'utf8');
    const newSource = readFileSync(resolve(process.cwd(), 'app/monitors/new/monitor-new-page.tsx'), 'utf8');
    const editRouteSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/edit/page.tsx'), 'utf8');
    const editSource = readFileSync(resolve(process.cwd(), 'app/monitors/[monitorId]/edit/monitor-edit-page.tsx'), 'utf8');
    const editorSurfaceSource = readFileSync(resolve(process.cwd(), 'components/pages/monitor-editor-surface.tsx'), 'utf8');

    expect(listRouteSource).toContain("import MonitorManagePage from './monitor-manage-page'");
    expect(listSource).toContain('buildMonitorDetailHref');
    expect(listSource).toContain('buildMonitorEditHref');
    expect(listSource).toContain('buildMonitorNewHref');

    expect(detailSource).toContain("from '@/lib/monitor-manage/navigation'");
    expect(detailSource).toContain('buildMonitorListReturnHref');
    expect(detailSource).toContain('buildMonitorEditHref');
    expect(detailSource).not.toContain("from '@/lib/monitor-editor/navigation'");
    expect(detailSource).not.toContain('buildMonitorEditorReturnUrl');

    expect(newRouteSource).toContain("import MonitorNewPage from './monitor-new-page'");
    expect(newSource).toContain('returnContext={returnContext}');
    expect(newRouteSource).toContain('readMonitorNewRouteState(resolvedSearchParams)');
    expect(newSource).not.toContain("returnLabel: searchParams.get('returnLabel')");
    expect(editRouteSource).toContain("import MonitorEditPage from './monitor-edit-page'");
    expect(editSource).toContain('returnContext={returnContext}');
    expect(editRouteSource).toContain('readMonitorEditRouteState(resolvedSearchParams)');
    expect(editSource).not.toContain("returnLabel: searchParams.get('returnLabel')");
    const queryStateSource = readFileSync(resolve(process.cwd(), 'lib/monitor-editor/query-state.ts'), 'utf8');
    expect(queryStateSource).toContain("labels: reader.get('labels')");
    expect(queryStateSource).toContain("pageIndex: reader.get('pageIndex')");
    expect(queryStateSource).toContain("pageSize: reader.get('pageSize')");
    expect(queryStateSource).toContain("entityId: reader.get('entityId')");
    expect(queryStateSource).toContain("entityName: reader.get('entityName')");
    expect(queryStateSource).not.toContain("returnLabel: reader.get('returnLabel')");

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
