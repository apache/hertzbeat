import { describe, expect, it } from 'vitest';
import {
  buildCatalogRows,
  buildDiscoveryBulkOverrideTags,
  buildDiscoveryBulkSuggestionChips,
  buildDiscoveryBulkSummary,
  buildDiscoveryFacts,
  buildDiscoveryGovernanceCards,
  buildDiscoveryIntakeQueueGroups,
  buildDiscoveryMetrics,
  buildDiscoveryMonitorRows,
  buildDiscoveryScopeOptions,
  buildDiscoveryTableRows
} from './view-model';

describe('entity discovery view model', () => {
  it('builds discovery facts', () => {
    expect(
      buildDiscoveryFacts(
        [{}, {}] as any,
        [{}, {}] as any,
        { owners: ['ops', 'platform'] } as any
      )
    ).toEqual([
      { label: 'Workspace', value: 'entities/discovery' },
      { label: 'Presets', value: '2' },
      { label: 'Activities', value: '2' },
      { label: 'Owners', value: '2' }
    ]);
  });

  it('builds discovery metrics', () => {
    expect(
      buildDiscoveryMetrics(
        [{}, {}] as any,
        { owners: ['ops'], systems: ['checkout', 'billing'], environments: ['prod'] } as any
      )
    ).toEqual([
      { label: 'owners', value: '1' },
      { label: 'systems', value: '2' },
      { label: 'environments', value: '1' },
      { label: 'preset coverage', value: 'ready', tone: 'success' }
    ]);
  });

  it('builds catalog rows', () => {
    expect(
      buildCatalogRows({ owners: ['ops'], systems: ['checkout'], environments: ['prod'] } as any)
    ).toEqual([
      { title: 'owners', copy: 'ops', meta: 'count 1' },
      { title: 'systems', copy: 'checkout', meta: 'count 1' },
      { title: 'environments', copy: 'prod', meta: 'count 1' }
    ]);
  });

  it('builds discovery monitor rows for the telemetry search results console', () => {
    expect(
      buildDiscoveryMonitorRows([{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }] as any)
    ).toEqual([
      {
        title: 'checkout-api',
        copy: 'springboot3 · 10.0.0.1',
        meta: '#9 · status 0'
      }
    ]);
  });

  it('builds cold discovery table rows from governance presets before search results arrive', () => {
    expect(
      buildDiscoveryTableRows(
        [],
        [{ id: 'preset-1', name: 'checkout baseline', owner: 'platform', system: 'checkout', environment: 'prod', status: 'active' }] as any,
        { owners: ['platform'], systems: ['checkout'], environments: ['prod'] } as any
      )
    ).toEqual([
      {
        key: 'preset-preset-1',
        name: 'checkout baseline',
        instance: 'checkout',
        status: '已启用',
        owner: 'platform',
        system: 'checkout',
        environment: 'prod',
        activity: '目录预设',
        href: '/entities/discovery?preset=preset-1',
        attributionState: 'preset',
        attributionLabel: '目录预设',
        attributionCopy: '可作为候选确认基线',
        primaryActionLabel: '查看预设'
      }
    ]);
  });

  it('builds cold discovery table rows from searched telemetry monitors with Chinese status and activity copy', () => {
    expect(
      buildDiscoveryTableRows(
        [{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }] as any,
        [{ id: 'preset-1', name: 'spring catalog', owner: 'platform', system: 'springboot3', environment: 'prod' }] as any,
        { owners: ['ops'], systems: ['checkout'], environments: ['prod'] } as any
      )
    ).toEqual([
      {
        key: 'monitor-9',
        name: 'checkout-api',
        instance: '10.0.0.1',
        status: '正常',
        owner: 'platform',
        system: 'springboot3',
        environment: 'prod',
        activity: '搜索结果',
        href: '/entities/discovery?source=telemetry&monitorId=9&action=merge',
        attributionState: 'merge',
        attributionLabel: '建议归并',
        attributionCopy: '候选实体 spring catalog',
        primaryActionLabel: '确认归并'
      }
    ]);
  });

  it('marks telemetry discovery rows as missing attribution before they can become trusted entities', () => {
    expect(
      buildDiscoveryTableRows(
        [{ id: 10, name: 'anonymous-worker', app: 'worker', instance: '', status: 2 }] as any,
        [] as any,
        { owners: [], systems: [], environments: [] } as any
      )
    ).toEqual([
      {
        key: 'monitor-10',
        name: 'anonymous-worker',
        instance: '-',
        status: '待确认',
        owner: '-',
        system: 'worker',
        environment: '-',
        activity: '搜索结果',
        href: '/entities/discovery?source=telemetry&monitorId=10&action=enrich',
        attributionState: 'review',
        attributionLabel: '归因待补齐',
        attributionCopy: '缺少负责人、环境',
        primaryActionLabel: '补齐归因'
      }
    ]);
  });

  it('builds merge-first governance cards when the telemetry search finds a catalog candidate', () => {
    expect(
      buildDiscoveryGovernanceCards(
        [{ id: 9, name: 'checkout-api', app: 'checkout', instance: '10.0.0.1', status: 0 }] as any,
        [{ id: 'preset-1', name: 'checkout-catalog', owner: 'platform', system: 'checkout', environment: 'prod' }] as any,
        { owners: ['platform'], systems: ['checkout'], environments: ['prod'] } as any
      )
    ).toEqual([
      expect.objectContaining({
        title: 'checkout-api',
        riskLabel: 'Governance risk medium',
        nextActionLabel: 'Next step merge',
        candidateLabel: 'Suggested entity · checkout-catalog · score strong',
        actions: [
          expect.objectContaining({ label: 'Merge into suggested entity', kind: 'primary' }),
          expect.objectContaining({ label: 'Open definition', kind: 'secondary' }),
          expect.objectContaining({ label: 'Open suggested entity', kind: 'secondary' }),
          expect.objectContaining({ label: 'Adopt as draft', kind: 'link' })
        ]
      })
    ]);
  });

  it('builds enrich-first governance cards when the telemetry result is missing shared governance context', () => {
    expect(
      buildDiscoveryGovernanceCards(
        [{ id: 10, name: 'anonymous-worker', app: 'worker', instance: '', status: 2 }] as any,
        [] as any,
        { owners: [], systems: [], environments: [] } as any
      )
    ).toEqual([
      expect.objectContaining({
        title: 'anonymous-worker',
        riskLabel: 'Governance risk high',
        nextActionLabel: 'Next step enrich',
        actions: [
          expect.objectContaining({ label: 'Review governance', kind: 'primary' }),
          expect.objectContaining({ label: 'Send to definition workspace', kind: 'secondary' }),
          expect.objectContaining({ label: 'Adopt as draft', kind: 'link' })
        ]
      })
    ]);
  });

  it('builds scope options and intake queue groups around discovery governance cards', () => {
    const cards = buildDiscoveryGovernanceCards(
      [
        { id: 9, name: 'checkout-api', app: 'checkout', instance: '10.0.0.1', status: 0 },
        { id: 10, name: 'billing-worker', app: 'worker', instance: '', status: 2 },
        { id: 11, name: 'inventory-daemon', app: 'inventory', instance: '10.0.0.4', status: 0 }
      ] as any,
      [
        { id: 'preset-1', name: 'checkout-catalog', owner: 'platform', system: 'checkout', environment: 'prod' },
        { id: 'preset-2', name: 'inventory-catalog', owner: 'ops', system: 'inventory', environment: 'prod' }
      ] as any,
      { owners: ['platform'], systems: ['checkout', 'inventory'], environments: ['prod'] } as any
    );

    expect(buildDiscoveryScopeOptions(cards)).toEqual([
      { key: 'all', label: 'All', count: 3 },
      { key: 'matched', label: 'Matched', count: 2 },
      { key: 'resolved', label: 'Resolved', count: 0 },
      { key: 'new', label: 'Suggested new', count: 1 }
    ]);

    expect(buildDiscoveryIntakeQueueGroups(cards)).toEqual([
      expect.objectContaining({
        key: 'merge',
        title: 'Ready to merge',
        actionLabel: 'Select merge-ready',
        cardKeys: ['monitor-9', 'monitor-11']
      }),
      expect.objectContaining({
        key: 'create',
        title: 'Suggested new entities',
        actionLabel: 'Select suggested new',
        cardKeys: ['monitor-10']
      }),
      expect.objectContaining({
        key: 'resolved',
        title: 'Already resolved',
        actionLabel: 'View resolved',
        cardKeys: []
      })
    ]);
  });

  it('builds bulk selection summary from the currently selected discovery cards', () => {
    const cards = buildDiscoveryGovernanceCards(
      [
        { id: 9, name: 'checkout-api', app: 'checkout', instance: '10.0.0.1', status: 0 },
        { id: 10, name: 'billing-worker', app: 'worker', instance: '', status: 2 }
      ] as any,
      [{ id: 'preset-1', name: 'checkout-catalog', owner: 'platform', system: 'checkout', environment: 'prod' }] as any,
      { owners: ['platform'], systems: ['checkout'], environments: ['prod'] } as any
    );

    expect(buildDiscoveryBulkSummary(cards, new Set(['monitor-9', 'monitor-10']))).toEqual({
      totalCount: 2,
      selectedCount: 2,
      mergeReadyCount: 1,
      createReadyCount: 1,
      reviewCount: 0
    });
  });

  it('builds active bulk governance override tags for owner and system fields', () => {
    expect(
      buildDiscoveryBulkOverrideTags({
        ownerDraft: 'catalog-oncall',
        systemDraft: 'commerce-platform'
      })
    ).toEqual([
      { label: 'Owner', value: 'catalog-oncall' },
      { label: 'System', value: 'commerce-platform' }
    ]);
  });

  it('builds owner/system suggestion chips and preset-assisted shortcuts for bulk overrides', () => {
    expect(
      buildDiscoveryBulkSuggestionChips(
        { owners: ['catalog-oncall', 'ops'], systems: ['commerce-platform', 'inventory-platform'] } as any,
        [{ id: 'preset-1', name: 'catalog baseline', bulkOwner: 'catalog-oncall', bulkSystem: 'commerce-platform' }] as any,
        {
          ownerDraft: 'catalog-oncall',
          systemDraft: ''
        }
      )
    ).toEqual({
      ownerChips: [
        { label: 'catalog-oncall', active: true },
        { label: 'ops', active: false }
      ],
      systemChips: [
        { label: 'commerce-platform', active: false },
        { label: 'inventory-platform', active: false }
      ],
      presetActions: [
        {
          label: 'Apply catalog baseline',
          owner: 'catalog-oncall',
          system: 'commerce-platform',
          active: false
        }
      ]
    });
  });
});
