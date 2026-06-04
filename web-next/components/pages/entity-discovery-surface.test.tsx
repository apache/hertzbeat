import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
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

vi.mock('@/lib/entity-discovery/view-model', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });

  return {
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
        attributionLabel: t('entities.discovery.row.attribution.preset.label'),
        attributionCopy: t('entities.discovery.row.attribution.preset.copy'),
        primaryActionLabel: t('entities.discovery.row.attribution.preset.action')
      }))
  };
});

const han = (...codes: number[]) => String.fromCodePoint(...codes);

describe('EntityDiscoverySurface', () => {
  const zh = createTranslatorMock({ locale: 'zh-CN' });

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
    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).not.toContain('md:grid-cols-[minmax(0,1fr)_auto_auto]');
    expect(source).not.toContain('className={`${coldEntityDiscoveryVisual.search.row} h-[36px]');
    expect(source).not.toContain('data-entity-discovery-search-input-shell');
    expect(source).not.toContain('coldEntityDiscoveryVisual.search.input');
    expect(source).not.toContain("from '@/components/ui/input'");
    expect(source).not.toContain(han(0x8865, 0x9f50));
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
    expect(source).not.toContain(han(0x539f, 0x56e0));
    expect(source).not.toContain(han(0x63a5, 0x7740, 0x53ef, 0x505a));
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('SurfaceSection');
    expect(source).not.toContain('RailSection');
    expect(source).not.toContain('WorkbenchInsetPanel');
    expect(source).not.toContain('WorkbenchStack');
    expect(source).not.toContain('MetricGrid');
    expect(source).not.toContain('RowList');
    expect(source).not.toContain('EntityDiscoveryGovernanceList');
    expect(source).not.toContain('EntityDiscoveryIntakeConsole');
    expect(source).not.toContain(`aria-label="${han(0x8303, 0x56f4)}"`);
    expect(source).not.toContain(han(0x5168, 0x90e8, 0x6765, 0x6e90));
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
    expect(html).toContain('data-entity-discovery-style-baseline="hertzbeat-ui-matte"');
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
    expect(html).toContain(zh('entities.discovery.table.column.attribution'));
    expect(html).toContain(zh('entities.discovery.workspace.title'));
    expect(html).toContain(zh('entities.discovery.empty.title'));
    expect(html).toContain(zh('entities.discovery.search.placeholder'));
    expect(html).toContain(zh('entities.discovery.empty.idle.copy'));
    expect(html).toContain(zh('entities.discovery.policy.title'));
    expect(html).toContain(zh('entities.discovery.policy.copy'));
    expect(html).toContain(zh('entities.discovery.action.import'));
    expect(html).toContain(zh('entities.discovery.action.create'));
    expect(html).toContain(zh('dashboard.home.status.entities'));
    expect(html).toContain(`${zh('entities.discovery.catalog.owner')} · platform`);
    expect(html).toContain(`${zh('entities.discovery.catalog.system')} · checkout`);
    expect(html).toContain(`${zh('entities.discovery.catalog.environment')} · prod`);
    expect(html).not.toContain('checkout baseline');
    expect(html).not.toContain('data-entity-discovery-route="signoz-discovery-table"');
    expect(html).not.toContain('data-entity-discovery-rail="signoz-status-rail"');
    expect(html).not.toContain('data-entity-discovery-right-panel="angular-density"');
    expect(html).not.toContain('data-entity-discovery-table="signoz-discovery-table"');
    expect(html).not.toContain('data-entity-discovery-empty-canvas="angular-blank-canvas"');
    expect(html).not.toContain(han(0x5e38, 0x7528, 0x5165, 0x53e3));
    expect(html).not.toContain(han(0x539f, 0x56e0));
    expect(html).not.toContain(han(0x63a5, 0x7740, 0x53ef, 0x505a));
    expect(html).not.toContain(han(0x5168, 0x90e8, 0x6765, 0x6e90));
    expect(html).not.toContain(`aria-label="${han(0x8303, 0x56f4)}"`);
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
    expect(html).toContain(zh('entities.discovery.candidate.title'));
    expect(html).toContain('service.name = billing');
    expect(html).toContain(`${zh('entities.discovery.candidate.namespace')} · commerce`);
    expect(html).toContain(`${zh('entities.discovery.candidate.environment')} · prod`);
    expect(html).toContain('value="billing-api"');
    expect(html).toContain('data-entity-discovery-candidate-action="create-draft"');
    expect(html).toContain(
      'href="/entities/new?source=otlp-candidate&amp;identityKey=service.name&amp;identityValue=billing&amp;serviceName=billing-api&amp;serviceNamespace=commerce&amp;environment=prod"'
    );
    expect(html).not.toContain(han(0x5df2, 0x5f52, 0x5c5e));
    expect(html).not.toContain(han(0x5065, 0x5eb7, 0x6b63, 0x5e38));
    expect(html).not.toContain(han(0x62d3, 0x6251, 0x5df2, 0x786e, 0x8ba4));
  }, 30000);
});
