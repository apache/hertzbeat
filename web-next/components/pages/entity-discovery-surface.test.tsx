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

    expect(source).toContain('data-entity-discovery-surface="otlp-hertzbeat-ui-discovery-console"');
    expect(source).toContain('data-entity-discovery-style-baseline={coldEntityDiscoveryVisual.canvasName}');
    expect(source).toContain('data-entity-discovery-layout="full-width-workbench"');
    expect(source).toContain('data-entity-discovery-header="hertzbeat-ui-compact-header"');
    expect(source).toContain('data-entity-discovery-header-nesting-contract="flat-page-introduction"');
    expect(source).toContain('className="p-0"');
    expect(source).not.toContain('className={coldEntityDiscoveryVisual.panel.hero}');
    expect(source).toContain('data-entity-discovery-command-row="standard-equal-buttons"');
    expect(source).toContain('data-entity-discovery-command-action="import"');
    expect(source).toContain('data-entity-discovery-command-action="create"');
    expect(source).toContain('data-entity-discovery-command-action="catalog"');
    expect(source).toContain('data-entity-discovery-action-help-trigger="hertzbeat-ui-action-help"');
    expect(source).toContain('data-entity-discovery-action-help-style="icon-after-action"');
    expect(source).toContain('data-entity-discovery-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-entity-discovery-action-help-icon="lucide-circle-help"');
    expect(source).toContain('rounded-none border-0 bg-transparent p-0');
    expect(source).toContain('const displayMatchedCount = matchedCount + (candidateResolved ? 1 : 0);');
    expect(source).toContain('CircleHelp');
    expect(source).not.toContain('HelpCircle');
    expect(source).not.toContain('<span aria-hidden="true" className="text-[11px] font-semibold leading-none">');
    expect(source).toContain('data-entity-discovery-action-help-item={help.id}');
    expect(source).toContain("id: 'import', ...entityDiscoveryActionHelp(t, 'import')");
    expect(source).toContain("id: 'create', ...entityDiscoveryActionHelp(t, 'create')");
    expect(source).toContain("id: 'catalog', ...entityDiscoveryActionHelp(t, 'catalog')");
    expect(source).toContain("'candidate-create'");
    expect(source).toContain("'candidate-open'");
    expect(source).toContain('data-entity-discovery-command-action="candidate-open"');
    expect(source).toContain('data-entity-discovery-command-action="candidate-checking"');
    expect(source).toContain('data-entity-discovery-command-action="candidate-retry"');
    expect(source).toContain('data-entity-discovery-command-action="candidate-create"');
    expect(source).toContain('isEntityDiscoveryCandidateCreateReady(candidateContext, candidateEntityLookupStatus, candidateResolved)');
    expect(source).toContain('data-entity-discovery-candidate-action="checking-existing"');
    expect(source).toContain('data-entity-discovery-candidate-action="retry-lookup"');
    expect(source).toContain("t('entities.discovery.candidate.checking.title')");
    expect(source).toContain("t('entities.discovery.candidate.lookup-failed.title')");
    expect(source).toContain('data-entity-discovery-count-strip="hertzbeat-ui-inline-counts"');
    expect(source).toContain("from '../ui/search-row'");
    expect(source).toContain('data-entity-discovery-toolbar="hertzbeat-ui-search-row"');
    expect(source).toContain('data-entity-discovery-search-owner="shared-search-row"');
    expect(source).toContain('inputWidthClassName="w-[360px]"');
    expect(source).toContain('initialSearch = null');
    expect(source).toContain('initialSource = null');
    expect(source).toContain('initialPageIndex = 0');
    expect(source).toContain('deleteSuccess = false');
    expect(source).toContain('data-entity-discovery-delete-success="entity-delete-confirmed"');
    expect(source).toContain('data-entity-discovery-delete-success-owner="hertzbeat-ui-inline-feedback"');
    expect(source).toContain("t('entities.discovery.delete-success.description'");
    expect(source).toContain('const routeSearch = initialSearch?.trim() ??');
    expect(source).toContain('const seededSearch = routeSearch || candidateSearch');
    expect(source).toContain('const [search, setSearch] = useState(seededSearch)');
    expect(source).toContain('const initialRouteSearchKeyRef = useRef<string | null>(null);');
    expect(source).toContain('const [resultPageIndex, setResultPageIndex] = useState(initialPageIndex)');
    expect(source).toContain("params.set('pageIndex', String(pageIndex));");
    expect(source).toContain("params.set('source', normalizedSource);");
    expect(source).toContain('const discoveryReturnHref = useMemo(() =>');
    expect(source).toContain('return buildEntityDiscoveryReturnHref(search, resultPageIndex, initialSource);');
    expect(source).toContain('buildDiscoveryTableRows(results, presets, catalog, t, { returnTo: discoveryReturnHref })');
    expect(source).toContain('void runSearch(routeSearch, initialPageIndex)');
    expect(source).toContain('const overflowMonitorCenterHref = useMemo(() =>');
    expect(source).toContain("source: initialSource?.trim() || 'entity-discovery-overflow'");
    expect(source).toContain('returnTo: discoveryReturnHref');
    expect(source).toContain("return `/monitors?${params.toString()}`");
    expect(source).toContain('async (nextSearch: string, nextPageIndex = 0) =>');
    expect(source).toContain('const routeSearchKey = JSON.stringify([routeSearch, initialPageIndex]);');
    expect(source).toContain('if (initialRouteSearchKeyRef.current === routeSearchKey) {');
    expect(source).toContain('initialRouteSearchKeyRef.current = routeSearchKey;');
    expect(source).not.toContain('async (nextSearch = search, nextPageIndex = 0)');
    expect(source).toContain('data-entity-discovery-overflow-action="monitor-center"');
    expect(source).toContain('data-entity-discovery-command-action="open-monitor-center"');
    expect(source).toContain('data-entity-discovery-result-pagination="inline"');
    expect(source).toContain('data-entity-discovery-command-action="previous-page"');
    expect(source).toContain('data-entity-discovery-command-action="next-page"');
    expect(source).toContain('data-entity-discovery-result-pagination-previous="true"');
    expect(source).toContain('data-entity-discovery-result-pagination-next="true"');
    expect(source).toContain("previousPageLabel: t('common.previous-page')");
    expect(source).toContain("nextPageLabel: t('common.next-page')");
    expect(source).toContain("pageSummary = t('common.pagination.summary'");
    expect(source).toContain("? t('entities.discovery.table.result-count', { count: 0 })");
    expect(source).toContain('searchDiscoveryMonitors(apiMessageGet, submission.normalizedSearch, nextPageIndex)');
    expect(source).toContain('onPrevious: () => void runSearch(search, Math.max(0, resultPageIndex - 1))');
    expect(source).toContain('onNext: () => void runSearch(search, resultPageIndex + 1)');
    expect(source).toContain('onSearch={() => void runSearch(search, 0)}');
    expect(source).toContain("overflowActionLabel: t('entities.discovery.table.overflow-action.monitor-center')");
    expect(source).toContain('data-entity-discovery-policy-panel="hertzbeat-ui-policy-strip"');
    expect(source).toContain('data-entity-discovery-empty-state="hertzbeat-ui-inline-empty"');
    expect(source).toContain('data-entity-discovery-empty-state-mode={emptyStateMode}');
    expect(source).toContain('data-entity-discovery-empty-actions="source-entrypoints"');
    expect(source).toContain('data-entity-discovery-command-action={action.id}');
    expect(source).toContain('data-entity-discovery-empty-action={action.id}');
    expect(source).toContain("href: '/monitors?source=entity-discovery-empty'");
    expect(source).toContain("href: '/ingestion/otlp?source=entity-discovery-empty'");
    expect(source).toContain("emptyStateMode={searched ? 'no-results' : 'idle'}");
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('max-w-[520px]');
    expect(source).toContain('data-entity-discovery-table-shell="hertzbeat-ui-dense-table"');
    expect(source).toContain('data-entity-discovery-table="hertzbeat-ui-discovery-table"');
    expect(source).toContain("data-entity-discovery-table-density={rows.length > 0 ? 'wide-results' : 'empty-state-fit'}");
    expect(source).toContain("rows.length > 0 ? 'min-w-[760px] xl:min-w-[1120px]' : 'min-w-full'");
    expect(source).toContain('data-entity-discovery-action-column="sticky-visible"');
    expect(source).toContain('sticky right-0 z-10 hidden w-[136px] border-l border-[#252b34] bg-[#101217]');
    expect(source).toContain('sticky right-0 z-10 hidden border-l border-[#252b34] bg-[#0b0c0e]');
    expect(source).toContain('data-entity-discovery-attribution-state={row.attributionState}');
    expect(source).toContain('data-entity-discovery-row-compact-context="first-column-narrow-viewport"');
    expect(source).toContain('data-entity-discovery-row-compact-actions="first-column-narrow-viewport"');
    expect(source).toContain('data-entity-discovery-row-compact-action="open-result"');
    expect(source).toContain('{row.attributionLabel}');
    expect(source).toContain('{row.primaryActionLabel}');
    expect(source).toContain('data-entity-discovery-row-actions="hertzbeat-ui-inline-actions"');
    expect(source).toContain('data-entity-discovery-command-action="open-result"');
    expect(source).toContain('data-entity-discovery-source-chips="hertzbeat-ui-inline-chips"');
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
    expect(source).not.toContain('data-entity-discovery-action-help-style="literal-question-after-action"');
    expect(source).not.toContain('data-entity-discovery-action-help-visual="borderless-question"');
    expect(source).not.toContain('data-entity-discovery-action-help-visual=\"rounded-question\"');
    expect(source).not.toContain('rounded-full text-[#b8c7df]');
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

  it('keeps discovery source in monitor reconciliation return links', async () => {
    const { buildEntityDiscoveryReturnHref } = await import('./entity-discovery-surface');

    const href = buildEntityDiscoveryReturnHref('Codex PD 1486 Scale 1783274599372 Website 060', 1, 'product-design-1508');
    const parsed = new URL(href, 'https://hertzbeat.local');

    expect(parsed.pathname).toBe('/entities/discovery');
    expect(parsed.searchParams.get('search')).toBe('Codex PD 1486 Scale 1783274599372 Website 060');
    expect(parsed.searchParams.get('pageIndex')).toBe('1');
    expect(parsed.searchParams.get('source')).toBe('product-design-1508');
  });

  it('only allows OTLP candidate draft creation after duplicate lookup settles empty', async () => {
    const { isEntityDiscoveryCandidateCreateReady } = await import('./entity-discovery-surface');
    const candidateContext = {
      source: 'otlp-candidate',
      identityKey: 'service.name',
      identityValue: 'billing',
      search: 'billing'
    } as const;

    expect(isEntityDiscoveryCandidateCreateReady(candidateContext, 'idle', false)).toBe(false);
    expect(isEntityDiscoveryCandidateCreateReady(candidateContext, 'loading', false)).toBe(false);
    expect(isEntityDiscoveryCandidateCreateReady(candidateContext, 'error', false)).toBe(false);
    expect(isEntityDiscoveryCandidateCreateReady(candidateContext, 'settled', true)).toBe(false);
    expect(isEntityDiscoveryCandidateCreateReady(candidateContext, 'settled', false)).toBe(true);
  });

  it('renders a compact cold discovery console with Chinese object-directory copy and no right rail', async () => {
    const { EntityDiscoverySurface } = await import('./entity-discovery-surface');

    const html = renderToStaticMarkup(
      <EntityDiscoverySurface
        presets={[{ id: '1', name: 'checkout baseline', owner: 'platform', system: 'checkout', environment: 'prod', status: 'active' } as any]}
        activities={[{ id: '2', summary: 'preset synced', detail: 'shared governance updated', status: 'success', action: 'sync' } as any]}
        catalog={{ owners: ['platform'], systems: ['checkout'], environments: ['prod'] } as any}
        initialSearch="Codex PD 1315"
      />
    );

    expect(html).toContain('data-entity-discovery-surface="otlp-hertzbeat-ui-discovery-console"');
    expect(html).toContain('data-entity-discovery-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-entity-discovery-layout="full-width-workbench"');
    expect(html).toContain('data-entity-discovery-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-discovery-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('class="p-0"');
    expect(html).toContain('data-entity-discovery-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-discovery-command-action="import"');
    expect(html).toContain('data-entity-discovery-command-action="create"');
    expect(html).toContain('data-entity-discovery-command-action="catalog"');
    expect(html).toContain('data-entity-discovery-count-strip="hertzbeat-ui-inline-counts"');
    expect(html).toContain('data-entity-discovery-toolbar="hertzbeat-ui-search-row"');
    expect(html).toContain('data-entity-discovery-search-owner="shared-search-row"');
    expect(html).toContain('data-hz-search-row-owner="hertzbeat-ui-search-row"');
    expect(html).toContain('data-hz-search-input="fixed-width-direct"');
    expect(html).toContain('data-hz-search-control="direct-input"');
    expect(html).toContain('data-hz-search-chrome="no-extra-input-shell"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-entity-discovery-search-input-shell');
    expect(html).toContain('data-entity-discovery-policy-panel="hertzbeat-ui-policy-strip"');
    expect(html).toContain('data-entity-discovery-source-chips="hertzbeat-ui-inline-chips"');
    expect(html).toContain('data-entity-discovery-empty-state="hertzbeat-ui-inline-empty"');
    expect(html).toContain('data-entity-discovery-empty-state-mode="idle"');
    expect(html).toContain('data-entity-discovery-empty-actions="source-entrypoints"');
    expect(html).toContain('data-entity-discovery-empty-action="monitor-center"');
    expect(html).toContain('data-entity-discovery-empty-action="otlp-ingestion"');
    expect(html).toContain('data-entity-discovery-command-action="monitor-center"');
    expect(html).toContain('data-entity-discovery-command-action="otlp-ingestion"');
    expect(html).toContain('href="/monitors?source=entity-discovery-empty"');
    expect(html).toContain('href="/ingestion/otlp?source=entity-discovery-empty"');
    expect(html).toContain(zh('entities.discovery.empty.action.monitor-center'));
    expect(html).toContain(zh('entities.discovery.empty.action.otlp-ingestion'));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('data-entity-discovery-table-shell="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-entity-discovery-table="hertzbeat-ui-discovery-table"');
    expect(html).toContain('data-entity-discovery-table-density="empty-state-fit"');
    expect(html).toContain('data-entity-discovery-action-column="sticky-visible"');
    expect(html).toContain(zh('entities.discovery.table.column.attribution'));
    expect(html).toContain(zh('entities.discovery.workspace.title'));
    expect(html).toContain(zh('entities.discovery.empty.title'));
    expect(html).toContain(zh('entities.discovery.search.placeholder'));
    expect(html).toContain('value="Codex PD 1315"');
    expect(html).toContain(zh('entities.discovery.empty.idle.copy'));
    expect(html).toContain(zh('entities.discovery.policy.title'));
    expect(html).toContain(zh('entities.discovery.policy.copy'));
    expect(html).toContain(zh('entities.discovery.action.import'));
    expect(html).toContain(zh('entities.discovery.action.create'));
    expect(html).toContain(zh('dashboard.home.status.entities'));
    expect(html).toContain('data-entity-discovery-action-help="import"');
    expect(html).toContain('data-entity-discovery-action-help="create"');
    expect(html).toContain('data-entity-discovery-action-help="catalog"');
    expect(html).toContain('data-entity-discovery-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-entity-discovery-action-help-style="icon-after-action"');
    expect(html).toContain('data-entity-discovery-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-entity-discovery-action-help-icon="lucide-circle-help"');
    expect(html.match(/data-entity-discovery-action-help-style="icon-after-action"/g)).toHaveLength(3);
    expect(html.match(/data-entity-discovery-action-help-visual="circle-help-icon"/g)).toHaveLength(3);
    expect(html.match(/data-entity-discovery-action-help-icon="lucide-circle-help"/g)).toHaveLength(3);
    expect(html).toContain('rounded-none border-0 bg-transparent p-0');
    expect(html).not.toContain('<span aria-hidden="true" class="text-[11px] font-semibold leading-none">?</span>');
    expect(html).not.toContain('rounded-full text-[#b8c7df]');
    expect(html).toContain(zh('entities.discovery.action-help.import.body'));
    expect(html).toContain(zh('entities.discovery.action-help.create.body'));
    expect(html).toContain(zh('entities.discovery.action-help.catalog.body'));
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
    expect(html).toContain(`${zh('entities.discovery.metric.clues')}</span></span><span class="text-[17px] font-semibold tabular-nums text-[#eef2f7]">1</span>`);
    expect(html).toContain(`${zh('entities.discovery.metric.matched')}</span></span><span class="text-[17px] font-semibold tabular-nums text-[#eef2f7]">0</span>`);
    expect(html).toContain(`${zh('entities.discovery.metric.create-suggested')}</span></span><span class="text-[17px] font-semibold tabular-nums text-[#eef2f7]">0</span>`);
    expect(html).toContain(zh('entities.discovery.candidate.checking.title'));
    expect(html).toContain(zh('entities.discovery.candidate.checking.copy'));
    expect(html).toContain('service.name = billing');
    expect(html).toContain(`${zh('entities.discovery.candidate.namespace')} · commerce`);
    expect(html).toContain(`${zh('entities.discovery.candidate.environment')} · prod`);
    expect(html).toContain('value="billing-api"');
    expect(html).toContain('data-entity-discovery-candidate-resolution="idle"');
    expect(html).toContain('data-entity-discovery-command-action="candidate-checking"');
    expect(html).toContain('data-entity-discovery-candidate-action="checking-existing"');
    expect(html).toContain(zh('entities.discovery.candidate.action.checking'));
    expect(html).not.toContain('data-entity-discovery-candidate-action="create-draft"');
    expect(html).not.toContain('data-entity-discovery-action-help="candidate-create"');
    expect(html).not.toContain('/entities/new?source=otlp-candidate');
    expect(html).not.toContain(han(0x5df2, 0x5f52, 0x5c5e));
    expect(html).not.toContain(han(0x5065, 0x5eb7, 0x6b63, 0x5e38));
    expect(html).not.toContain(han(0x62d3, 0x6251, 0x5df2, 0x786e, 0x8ba4));
  }, 30000);

  it('shows delete success feedback when returning from an entity detail delete', async () => {
    const { EntityDiscoverySurface } = await import('./entity-discovery-surface');

    const html = renderToStaticMarkup(
      <EntityDiscoverySurface
        presets={[]}
        activities={[]}
        catalog={{ owners: [], systems: [], environments: [] } as any}
        deleteSuccess
        deletedEntity="42"
      />
    );

    expect(html).toContain('data-entity-discovery-delete-success="entity-delete-confirmed"');
    expect(html).toContain('data-entity-discovery-delete-success-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-entity-discovery-delete-success-id="42"');
    expect(html).toContain(zh('common.notify.delete-success'));
    expect(html).toContain(zh('entities.discovery.delete-success.description', { id: '42' }));
  });
});
