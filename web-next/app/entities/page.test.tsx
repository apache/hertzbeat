import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntitiesPage from './page';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
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

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key)
    }) as { get(name: string): string | null }
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'entities.list.title': '对象目录',
        'entities.list.environment.select': '选择环境',
        'entities.list.environment.all': '全部环境',
        'entities.list.resource-search.placeholder': '搜索并过滤资源属性',
        'entities.list.action.new': '新建对象',
        'entities.list.column.object': '对象',
        'entities.list.column.type': '类型',
        'entities.list.column.status': '状态',
        'entities.list.column.alerts': '告警',
        'entities.list.column.monitors': '监控',
        'entities.list.column.relations': '关系',
        'entities.list.column.updated': '最近证据',
        'entities.list.pagination.items': '{{from}}-{{to}} / {{total}} 项',
        'common.clear': '清除',
        'common.apply-filters': '应用筛选'
      }
    })
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
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
  apiMessageGet: vi.fn()
}));

vi.mock('@/lib/entity-manage/controller', () => ({
  loadEntityList
}));

vi.mock('@/lib/entity-manage/display-mapping', () => ({
  entityEnvironmentLabel: (value: string) => value,
  entityStatusLabel: (value: string) => value,
  entityTypeLabel: (value: string) => value
}));

vi.mock('@/lib/entity-manage/query-state', () => ({
  buildEntityUrl: vi.fn(),
  queryStateFromParams: (params: { get(name: string): string | null }) => ({
    search: params.get('search') || '',
    type: params.get('type') || '',
    status: params.get('status') || ''
  }),
  queryStateToQueryString: (query: Record<string, string>) =>
    new URLSearchParams(
      Object.entries(query).filter(([, value]) => value)
    ).toString()
}));

vi.mock('@/lib/entity-manage/view-model', () => ({
  buildEntityTableRows: vi.fn(() => [
    {
      key: '1',
      name: 'checkout-service',
      type: '服务',
      environment: '本地',
      status: 'healthy',
      monitorCount: '1',
      activeAlertCount: '0',
      relationCount: '2',
      updatedAt: 'now',
      href: '/entities/1'
    }
  ])
}));

vi.mock('@/lib/format', () => ({
  formatTime: vi.fn(() => 'now')
}));

describe('EntitiesPage', () => {
  beforeEach(() => {
    mockState.searchParams = new URLSearchParams('search=checkout&type=service&status=healthy');
    mockState.lastLoad = null;
    loadEntityList.mockClear().mockResolvedValue(mockState.renderData.list);
  });

  it('loads the entity list through the shared controller contract', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/entities/page.tsx'), 'utf8');
    const html = renderToStaticMarkup(<EntitiesPage />);

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
    expect(html).toContain('对象优先调查');
    expect(html).toContain('对象目录');
    expect(html).toContain('围绕服务、资源与实体定位问题并进入调查');
    expect(html).toContain('实体总数');
    expect(html).toContain('活跃异常对象');
    expect(html).toContain('搜索实体名称、命名空间、负责人');
    expect(html).toContain('搜索');
    expect(html).toContain('刷新');
    expect(html).toContain('创建实体');
    expect(html).toContain('从遥测发现');
    expect(html).toContain('导入定义');
    expect(html).toContain('对象');
    expect(html).toContain('负责人');
    expect(html).toContain('进展');
    expect(html).toContain('证据关联');
    expect(html).toContain('下一步动作');
    expect(html).toContain('状态');
    expect(html).toContain('告警');
    expect(html).toContain('监控');
    expect(html).toContain('设置负责人');
    expect(html).toContain('日志线索');
    expect(html).toContain('checkout-service');
    expect(html).toContain('href="/entities/1"');
    expect(html).not.toContain('补负责人');
    expect(html).not.toContain('选择环境 · 全部环境');
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

    await mockState.lastLoad?.();

    expect(loadEntityList).toHaveBeenCalledWith(expect.any(Function), {
      search: 'checkout',
      type: 'service',
      status: 'healthy'
    });
  });
});
