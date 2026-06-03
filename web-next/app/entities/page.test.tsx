import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityListPage from './entity-list-page';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    list: {
      content: [],
      totalElements: 0
    }
  }
}));

const loadEntityList = vi.hoisted(() => vi.fn(async () => mockState.renderData.list));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true" data-loading-copy={loadingCopy}>{children(mockState.renderData)}</div>;
  }
}));

vi.mock('@/components/observability', () => ({
  DrawerCodePreview: ({ children }: any) => <pre data-drawer-code-preview="true">{children}</pre>,
  DrawerSection: ({ title, children }: any) => (
    <section data-drawer-section={title}>
      <h3>{title}</h3>
      {children}
    </section>
  ),
  ObservabilityStatusState: ({ title, copy }: any) => (
    <div>
      {title}
      {copy}
    </div>
  ),
  StageSection: ({ title, children }: any) => (
    <section data-stage-section={title}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  SelectableEvidenceList: ({ rows }: any) => <div>{rows.map((row: any) => row.title).join('|')}</div>,
  SummaryMetricGrid: ({ items }: any) => <div data-summary-metric-grid="true">{items.map((item: any) => item.label).join('|')}</div>,
  ToolbarField: ({ label, children }: any) => (
    <label>
      {label}
      {children}
    </label>
  ),
  ToolbarRow: ({ children }: any) => <div data-toolbar-row="true">{children}</div>
}));

vi.mock('@/components/workbench/primitives', () => ({
  WorkbenchStack: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => <div>{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ title, subtitle, actions, main, side }: any) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{actions}</div>
      <div>{main}</div>
      <aside>{side}</aside>
    </main>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/lib/api-client', () => ({
}));

vi.mock('@/lib/api-facade', () => ({
  api: {
    entities: {
      list: vi.fn()
    }
  }
}));

vi.mock('@/lib/entity-manage/controller', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/entity-manage/controller')>();
  return {
    ...actual,
    loadEntityListFromFacade: loadEntityList
  };
});

vi.mock('@/lib/entity-manage/display-mapping', () => ({
  entityEnvironmentLabel: (value: string) => value,
  entityStatusLabel: (value: string) => value,
  entityTypeLabel: (value: string) => value
}));

vi.mock('@/lib/entity-manage/query-state', () => ({
  buildEntityUrl: vi.fn(),
  queryStateToQueryString: (query: Record<string, string>) =>
    new URLSearchParams(
      Object.entries(query).filter(([, value]) => value)
    ).toString()
}));

vi.mock('@/lib/entity-manage/view-model', () => ({
  isEntityHealthyStatus: (status: string | null | undefined) =>
    ['healthy', 'up', 'normal'].includes(String(status || '').toLowerCase().replace(/[\s-]+/g, '_')),
  buildEntityTableRows: vi.fn(() => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    return [
      {
        key: '1',
        name: 'checkout-service',
        type: t('entities.list.type.service'),
        environment: t('entities.list.environment.local'),
        status: 'healthy',
        monitorCount: '1',
        activeAlertCount: '0',
        relationCount: '2',
        updatedAt: 'now',
        href: '/entities/1'
      }
    ];
  })
}));

vi.mock('@/lib/format', () => ({
  formatTime: vi.fn(() => 'now')
}));

describe('EntityListPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    loadEntityList.mockClear().mockResolvedValue(mockState.renderData.list);
  });

  it('keeps entity catalog remounts on a short settled cache window while refresh invalidates that cache', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/entities/entity-list-page.tsx'), 'utf8');

    expect(source).toContain('ENTITY_LIST_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['entity-list', entityListUrl, refreshNonce].join(':')");
    expect(source).toContain('setRefreshNonce(current => current + 1)');
    expect(source).toContain('onRefresh={refreshQuery}');
    expect(source).toContain('cacheSettledTtlMs={ENTITY_LIST_SETTLED_CACHE_TTL_MS}');
  });

  it('loads the entity list through the shared controller contract', async () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const source = readFileSync(resolve(process.cwd(), 'app/entities/entity-list-page.tsx'), 'utf8');
    const initialQuery = { search: 'checkout', type: 'service', status: 'healthy' };
    const html = renderToStaticMarkup(<EntityListPage initialQuery={initialQuery} />);

    expect(html).toContain(`data-loading-copy="${expectedT('entities.list.loading')}"`);
    expect(html).toContain('data-entity-list-surface="otlp-cold-entity-console"');
    expect(html).toContain('data-entity-list-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-entity-list-header="cold-compact-header"');
    expect(html).toContain('data-entity-list-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-list-admin-layout="full-width-admin-list"');
    expect(html).toContain('data-entity-list-count-strip="cold-inline-counts"');
    expect(html).toContain('data-entity-list-toolbar="cold-table-toolbar"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-entity-list-refresh-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-clear-action="search-row-secondary"');
    expect(html).toContain('data-entity-list-table-shell="cold-dense-table"');
    expect(html).toContain('data-entity-list-table="cold-entity-table"');
    expect(html).toContain('data-entity-list-row-actions="cold-inline-actions"');
    expect(html).toContain(expectedT('entities.list.kicker'));
    expect(html).toContain(expectedT('entities.list.title'));
    expect(html).toContain(expectedT('entities.list.subtitle'));
    expect(html).toContain(expectedT('entities.list.metric.total'));
    expect(html).toContain(expectedT('entities.list.metric.abnormal'));
    expect(html).toContain(expectedT('entities.list.search.placeholder'));
    expect(html).toContain(expectedT('common.search'));
    expect(html).toContain(expectedT('common.refresh'));
    expect(html).toContain(expectedT('entities.list.action.create'));
    expect(html).toContain(expectedT('entities.list.action.discovery'));
    expect(html).toContain(expectedT('entities.list.action.import'));
    expect(html).toContain(expectedT('entities.list.column.object'));
    expect(html).toContain(expectedT('entities.list.column.owner'));
    expect(html).toContain(expectedT('entities.list.column.progress'));
    expect(html).toContain(expectedT('entities.list.column.evidence'));
    expect(html).toContain(expectedT('entities.list.column.next-action'));
    expect(html).toContain(expectedT('entities.list.column.status'));
    expect(html).toContain(expectedT('entities.list.row.evidence.alerts', { count: 0 }));
    expect(html).toContain(expectedT('entities.list.row.evidence.monitors', { count: 1 }));
    expect(html).toContain(expectedT('entities.list.row.action.owner'));
    expect(html).toContain(expectedT('entities.list.row.action.logs'));
    expect(html).toContain('checkout-service');
    expect(html).toContain('href="/entities/1"');
    expect(html).not.toContain(expectedT('entities.editor.attribution.owner.missing-meta'));
    expect(html).not.toContain(`${expectedT('entities.list.environment.select')} · ${expectedT('entities.list.environment.all')}`);
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-entity-list-rail=');
    expect(html).not.toContain('data-entity-list-action-panel=');
    expect(html).not.toContain('signoz-services-table');
    expect(html).not.toContain('signoz-services-rail');
    expect(html).not.toContain('angular-sidebar-flush');
    expect(source).toContain("components/pages/entity-list-surface");
    expect(source).not.toContain("from '@/components/observability'");
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('DrawerCodePreview');
    expect(source).not.toContain('SelectableEvidenceList');
    expect(source).not.toContain("from '@/components/workbench/primitives'");
    expect(source).not.toContain("from '@/components/workbench/toolbar'");
    expect(source).not.toContain('signoz-services-table');
    expect(source).not.toContain('signoz-services-rail');
    expect(source).not.toContain('angular-sidebar-flush');
    expect(source).toContain("import { api } from '@/lib/api-facade';");
    expect(source).toContain('const list = await loadEntityListFromFacade(api.entities.list, query);');
    expect(source).not.toContain('const list = await loadEntityList(apiMessageGet, query);');

    await mockState.lastLoad?.();

    expect(loadEntityList).toHaveBeenCalledWith(expect.any(Function), {
      search: 'checkout',
      type: 'service',
      status: 'healthy'
    });
  });
});
