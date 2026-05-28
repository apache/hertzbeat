import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'entities.discovery.workspace.kicker': '对象优先调查',
        'entities.discovery.workspace.title': '遥测发现',
        'entities.discovery.workspace.subtitle': '先搜索一组需要治理的监控线索，再决定归并、完善归属，还是送入定义工作台继续收口。',
        'entities.discovery.action.import': '从定义创建',
        'entities.discovery.action.create': '创建实体',
        'entities.discovery.action.catalog': '对象目录',
        'entities.discovery.action.search': '搜索',
        'entities.discovery.action.clear': '清空',
        'entities.discovery.search.placeholder': '搜索监控名称或实例',
        'entities.discovery.search.error': '遥测发现查询失败',
        'entities.discovery.candidate.title': 'OTLP 候选实体',
        'entities.discovery.candidate.copy': '保留 OTLP 资源身份，确认后再写入对象目录。',
        'entities.discovery.candidate.action.create': '创建实体草稿',
        'entities.discovery.candidate.identity': '资源身份',
        'entities.discovery.candidate.namespace': '命名空间',
        'entities.discovery.candidate.environment': '环境',
        'entities.discovery.policy.title': '治理筛选与共享策略',
        'entities.discovery.policy.copy': '按已有负责人、系统和环境预设给线索完善上下文。',
        'entities.discovery.policy.latest-activity': '最近活动 {{activity}}',
        'entities.discovery.policy.empty': '暂无共享策略，先搜索一条监控线索。',
        'entities.discovery.catalog.owner': '负责人',
        'entities.discovery.catalog.system': '系统',
        'entities.discovery.catalog.environment': '环境',
        'entities.discovery.metric.clues': '线索',
        'entities.discovery.metric.matched': '已匹配',
        'entities.discovery.metric.create-suggested': '建议新建',
        'entities.discovery.metric.catalog-sources': '目录来源',
        'entities.discovery.table.title': '发现线索',
        'entities.discovery.table.result-count': '{{count}} 条结果',
        'entities.discovery.table.waiting': '等待搜索',
        'entities.discovery.table.column.clue': '线索',
        'entities.discovery.table.column.instance': '实例',
        'entities.discovery.table.column.status': '状态',
        'entities.discovery.table.column.owner': '归属',
        'entities.discovery.table.column.system': '系统',
        'entities.discovery.table.column.environment': '环境',
        'entities.discovery.table.column.attribution': '归因',
        'entities.discovery.table.column.action': '操作',
        'entities.discovery.empty.title': '先搜索一组需要治理的监控线索',
        'entities.discovery.empty.search.copy': '没有找到匹配的监控线索。',
        'entities.discovery.empty.idle.copy': '先搜索一条监控，再把它转成实体草稿。',
        'entities.discovery.activity.preset-synced': '预设已同步',
        'entities.discovery.activity.shared-governance-updated': '共享治理已更新',
        'entities.discovery.activity.empty': '暂无活动'
      }
    })
  })
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/components/workbench/primitives', () => ({
  RailSection: ({ title, children }: any) => (
    <section data-rail-section="true">
      <h3>{title}</h3>
      {children}
    </section>
  ),
  SurfaceSection: ({ title, copy, children }: any) => (
    <section data-surface-section="true">
      <h2>{title}</h2>
      <p>{copy}</p>
      {children}
    </section>
  ),
  WorkbenchInsetPanel: ({ as: Component = 'div', children, ...props }: any) => (
    <Component data-workbench-inset-panel="true" {...props}>
      {children}
    </Component>
  ),
  WorkbenchStack: ({ children }: any) => <div data-workbench-stack="true">{children}</div>
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  MetricGrid: ({ items }: any) => <div data-metric-grid="true">{items.map((item: any) => `${item.label}:${item.value}`).join('|')}</div>,
  RowList: ({ rows }: any) => <div data-row-list="true">{rows.map((row: any) => row.title).join('|')}</div>,
  WorkbenchPage: ({ title, subtitle, actions, main, side }: any) => (
    <div data-workbench-page="true">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-workbench-actions="true">{actions}</div>
      <main>{main}</main>
      <aside>{side}</aside>
    </div>
  )
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn()
}));

vi.mock('@/lib/entity-discovery/controller', () => ({
  searchDiscoveryMonitors: vi.fn()
}));

vi.mock('@/lib/entity-discovery/view-model', () => ({
  buildCatalogRows: () => [],
  buildDiscoveryBulkOverrideTags: () => [],
  buildDiscoveryBulkSuggestionChips: () => ({ ownerChips: [], systemChips: [], presetActions: [] }),
  buildDiscoveryBulkSummary: () => ({ totalCount: 0, selectedCount: 0, mergeReadyCount: 0, createReadyCount: 0, reviewCount: 0 }),
  buildDiscoveryFacts: () => [],
  buildDiscoveryGovernanceCards: () => [],
  buildDiscoveryIntakeQueueGroups: () => [],
  buildDiscoveryMetrics: () => [],
  buildDiscoveryMonitorRows: () => [],
  buildDiscoveryScopeOptions: () => [],
  filterDiscoveryCardsByScope: (cards: any[]) => cards,
  buildDiscoveryTableRows: (_monitors: any[], presets: any[]) =>
    presets.map(preset => ({
      key: `preset-${preset.id}`,
      name: preset.name,
      instance: preset.system,
      status: preset.status,
      owner: preset.owner,
      system: preset.system,
      environment: preset.environment,
      activity: 'catalog preset',
      href: `/entities/discovery?preset=${preset.id}`,
      attributionState: 'preset',
      attributionLabel: '目录预设',
      attributionCopy: '可作为候选确认基线',
      primaryActionLabel: '查看预设'
    }))
}));

describe('EntityDiscoverySurface', () => {
  it('keeps discovery on the cold full-width HertzBeat owner instead of the old rail contract', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-discovery-surface.tsx'), 'utf8');

    expect(source).toContain('data-entity-discovery-surface="otlp-cold-discovery-console"');
    expect(source).toContain('data-entity-discovery-style-baseline={coldEntityDiscoveryVisual.canvasName}');
    expect(source).toContain('data-entity-discovery-layout="full-width-workbench"');
    expect(source).toContain('data-entity-discovery-header="cold-compact-header"');
    expect(source).toContain('data-entity-discovery-command-row="standard-equal-buttons"');
    expect(source).toContain('data-entity-discovery-count-strip="cold-inline-counts"');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('data-entity-discovery-toolbar="cold-search-row"');
    expect(source).toContain('data-entity-discovery-search-owner="shared-search-row"');
    expect(source).toContain('inputWidthClassName="w-[360px]"');
    expect(source).toContain('data-entity-discovery-policy-panel="cold-policy-strip"');
    expect(source).toContain('data-entity-discovery-empty-state="cold-inline-empty"');
    expect(source).toContain('data-entity-discovery-table-shell="cold-dense-table"');
    expect(source).toContain('data-entity-discovery-table="cold-discovery-table"');
    expect(source).toContain('data-entity-discovery-attribution-state={row.attributionState}');
    expect(source).toContain('{row.attributionLabel}');
    expect(source).toContain('{row.primaryActionLabel}');
    expect(source).toContain('data-entity-discovery-row-actions="cold-inline-actions"');
    expect(source).toContain('data-entity-discovery-source-chips="cold-inline-chips"');
    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).not.toContain('md:grid-cols-[minmax(0,1fr)_auto_auto]');
    expect(source).not.toContain('className={`${coldEntityDiscoveryVisual.search.row} h-[36px]');
    expect(source).not.toContain('data-entity-discovery-search-input-shell');
    expect(source).not.toContain('coldEntityDiscoveryVisual.search.input');
    expect(source).not.toContain("from '@/components/ui/input'");
    expect(source).not.toContain('补齐');
    expect(source).not.toContain('data-entity-discovery-route="signoz-discovery-table"');
    expect(source).not.toContain('data-entity-discovery-rail="signoz-status-rail"');
    expect(source).not.toContain('data-entity-discovery-controls="signoz-filter-bar"');
    expect(source).not.toContain('data-entity-discovery-search-band="angular-full-width"');
    expect(source).not.toContain('data-entity-discovery-empty-state="angular-empty-guidance"');
    expect(source).not.toContain('data-entity-discovery-empty-canvas="angular-blank-canvas"');
    expect(source).not.toContain('data-entity-discovery-policy-panel="angular-collapse-panel"');
    expect(source).not.toContain('data-entity-discovery-next-panel="angular-next-step"');
    expect(source).not.toContain('data-entity-discovery-action-panel="angular-common-actions"');
    expect(source).not.toContain('data-entity-discovery-right-panel="angular-density"');
    expect(source).not.toContain('data-entity-discovery-primary-action-row="angular-inline"');
    expect(source).not.toContain('data-entity-discovery-table-shell="signoz-table-shell"');
    expect(source).not.toContain('data-entity-discovery-table="signoz-discovery-table"');
    expect(source).not.toContain('原因');
    expect(source).not.toContain('接着可做');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('WorkbenchInsetPanel');
    expect(source).not.toContain('WorkbenchStack');
    expect(source).not.toContain('MetricGrid');
    expect(source).not.toContain('RowList');
    expect(source).not.toContain('EntityDiscoveryGovernanceList');
    expect(source).not.toContain('EntityDiscoveryIntakeConsole');
    expect(source).not.toContain('aria-label="范围"');
    expect(source).not.toContain('全部来源');
  });

  it('renders a compact cold discovery console with Chinese object-directory copy and no right rail', async () => {
    const { EntityDiscoverySurface } = await import('./entity-discovery-surface');

    const html = renderToStaticMarkup(
      <EntityDiscoverySurface
        presets={[{ id: '1', name: 'checkout baseline', owner: 'platform', system: 'checkout', environment: 'prod', status: 'active' } as any]}
        activities={[{ id: '2', summary: 'preset synced', detail: 'shared governance updated', status: 'success', action: 'sync' } as any]}
        catalog={{ owners: ['platform'], systems: ['checkout'], environments: ['prod'] } as any}
      />
    );

    expect(html).toContain('data-entity-discovery-surface="otlp-cold-discovery-console"');
    expect(html).toContain('data-entity-discovery-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-entity-discovery-layout="full-width-workbench"');
    expect(html).toContain('data-entity-discovery-header="cold-compact-header"');
    expect(html).toContain('data-entity-discovery-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-discovery-count-strip="cold-inline-counts"');
    expect(html).toContain('data-entity-discovery-toolbar="cold-search-row"');
    expect(html).toContain('data-entity-discovery-search-owner="shared-search-row"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-entity-discovery-search-input-shell');
    expect(html).toContain('data-entity-discovery-policy-panel="cold-policy-strip"');
    expect(html).toContain('data-entity-discovery-source-chips="cold-inline-chips"');
    expect(html).toContain('data-entity-discovery-empty-state="cold-inline-empty"');
    expect(html).toContain('data-entity-discovery-table-shell="cold-dense-table"');
    expect(html).toContain('data-entity-discovery-table="cold-discovery-table"');
    expect(html).toContain('归因');
    expect(html).toContain('遥测发现');
    expect(html).toContain('先搜索一组需要治理的监控线索');
    expect(html).toContain('搜索监控名称或实例');
    expect(html).toContain('先搜索一条监控，再把它转成实体草稿。');
    expect(html).toContain('治理筛选与共享策略');
    expect(html).toContain('完善上下文');
    expect(html).toContain('从定义创建');
    expect(html).toContain('创建实体');
    expect(html).toContain('实体');
    expect(html).toContain('负责人 · platform');
    expect(html).toContain('系统 · checkout');
    expect(html).toContain('环境 · prod');
    expect(html).not.toContain('checkout baseline');
    expect(html).not.toContain('data-entity-discovery-route="signoz-discovery-table"');
    expect(html).not.toContain('data-entity-discovery-rail="signoz-status-rail"');
    expect(html).not.toContain('data-entity-discovery-right-panel="angular-density"');
    expect(html).not.toContain('data-entity-discovery-table="signoz-discovery-table"');
    expect(html).not.toContain('data-entity-discovery-empty-canvas="angular-blank-canvas"');
    expect(html).not.toContain('常用入口');
    expect(html).not.toContain('原因');
    expect(html).not.toContain('接着可做');
    expect(html).not.toContain('全部来源');
    expect(html).not.toContain('aria-label="范围"');
    expect(html).not.toContain('data-workbench-page');
    expect(html).not.toContain('Governance presets');
    expect(html).not.toContain('Catalog suggestions');
  }, 30000);

  it('preserves OTLP candidate identity as confirmation context without inventing entity state', async () => {
    const { EntityDiscoverySurface } = await import('./entity-discovery-surface');

    const html = renderToStaticMarkup(
      <EntityDiscoverySurface
        presets={[]}
        activities={[]}
        catalog={{ owners: [], systems: [], environments: [] } as any}
        candidateContext={{
          source: 'otlp-candidate',
          identityKey: 'service.name',
          identityValue: 'billing',
          serviceName: 'billing-api',
          serviceNamespace: 'commerce',
          environment: 'prod',
          search: 'billing-api'
        }}
      />
    );

    expect(html).toContain('data-entity-discovery-otlp-candidate="query-context"');
    expect(html).toContain('data-entity-discovery-candidate-identity-key="service.name"');
    expect(html).toContain('data-entity-discovery-candidate-identity-value="billing"');
    expect(html).toContain('data-entity-discovery-candidate-service="billing-api"');
    expect(html).toContain('data-entity-discovery-candidate-namespace="commerce"');
    expect(html).toContain('data-entity-discovery-candidate-environment="prod"');
    expect(html).toContain('OTLP 候选实体');
    expect(html).toContain('service.name = billing');
    expect(html).toContain('命名空间 · commerce');
    expect(html).toContain('环境 · prod');
    expect(html).toContain('value="billing-api"');
    expect(html).toContain('data-entity-discovery-candidate-action="create-draft"');
    expect(html).toContain(
      'href="/entities/new?source=otlp-candidate&amp;identityKey=service.name&amp;identityValue=billing&amp;serviceName=billing-api&amp;serviceNamespace=commerce&amp;environment=prod"'
    );
    expect(html).not.toContain('已归属');
    expect(html).not.toContain('健康正常');
    expect(html).not.toContain('拓扑已确认');
  }, 30000);
});
