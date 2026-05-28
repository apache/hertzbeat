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
import { createTranslatorMock } from '../../test/i18n-test-helper';

describe('entity discovery view model', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });

  it('builds discovery facts', () => {
    expect(
      buildDiscoveryFacts(
        [{}, {}] as any,
        [{}, {}] as any,
        { owners: ['ops', 'platform'] } as any,
        t
      )
    ).toEqual([
      { label: '工作区', value: 'entities/discovery' },
      { label: '预设', value: '2' },
      { label: '活动', value: '2' },
      { label: '负责人', value: '2' }
    ]);
  });

  it('builds discovery metrics', () => {
    expect(
      buildDiscoveryMetrics(
        [{}, {}] as any,
        { owners: ['ops'], systems: ['checkout', 'billing'], environments: ['prod'] } as any,
        t
      )
    ).toEqual([
      { label: '负责人', value: '1' },
      { label: '系统', value: '2' },
      { label: '环境', value: '1' },
      { label: '预设覆盖', value: '就绪', tone: 'success' }
    ]);
  });

  it('builds catalog rows', () => {
    expect(
      buildCatalogRows({ owners: ['ops'], systems: ['checkout'], environments: ['prod'] } as any, t)
    ).toEqual([
      { title: '负责人', copy: 'ops', meta: '数量 1' },
      { title: '系统', copy: 'checkout', meta: '数量 1' },
      { title: '环境', copy: 'prod', meta: '数量 1' }
    ]);
  });

  it('builds discovery monitor rows for the telemetry search results console', () => {
    expect(
      buildDiscoveryMonitorRows([{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }] as any, t)
    ).toEqual([
      {
        title: 'checkout-api',
        copy: 'springboot3 · 10.0.0.1',
        meta: '#9 · 正常'
      }
    ]);
  });

  it('builds cold discovery table rows from governance presets before search results arrive', () => {
    expect(
      buildDiscoveryTableRows(
        [],
        [{ id: 'preset-1', name: 'checkout baseline', owner: 'platform', system: 'checkout', environment: 'prod', status: 'active' }] as any,
        { owners: ['platform'], systems: ['checkout'], environments: ['prod'] } as any,
        t
      )
    ).toEqual([
      {
        key: 'preset-preset-1',
        name: 'checkout baseline',
        instance: 'checkout',
        status: '已启用',
        statusTone: 'success',
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
        { owners: ['ops'], systems: ['checkout'], environments: ['prod'] } as any,
        t
      )
    ).toEqual([
      {
        key: 'monitor-9',
        name: 'checkout-api',
        instance: '10.0.0.1',
        status: '正常',
        statusTone: 'success',
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

  it('localizes fallback service names for discovered merge candidates and draft cards', () => {
    const monitors = [{ id: 11, name: 'node-worker', app: 'node_worker', instance: '10.0.0.2', status: 0 }] as any;
    const catalog = { owners: ['platform'], systems: ['node_worker'], environments: ['prod'] } as any;

    expect(buildDiscoveryTableRows(monitors, [], catalog, t)[0]).toEqual(
      expect.objectContaining({
        attributionState: 'merge',
        attributionCopy: '候选实体 node_worker 服务'
      })
    );

    expect(buildDiscoveryGovernanceCards(monitors, [], catalog, t)[0]).toEqual(
      expect.objectContaining({
        draftTitle: 'node-worker 服务',
        candidateLabel: '建议实体 · node_worker 服务 · 匹配强'
      })
    );
  });

  it('localizes empty governance card context values', () => {
    expect(
      buildDiscoveryGovernanceCards(
        [{ id: 12, name: 'queue-worker', app: 'queue', instance: '', status: 0 }] as any,
        [] as any,
        { owners: [], systems: ['queue'], environments: [] } as any,
        t
      )[0]
    ).toEqual(
      expect.objectContaining({
        meta: '#12 · queue · 无',
        draftSubtitle: '无 · queue · 无',
        candidateContext: '无 · queue · 无'
      })
    );
  });

  it('marks telemetry discovery rows as missing attribution before they can become trusted entities', () => {
    expect(
      buildDiscoveryTableRows(
        [{ id: 10, name: 'anonymous-worker', app: 'worker', instance: '', status: 2 }] as any,
        [] as any,
        { owners: [], systems: [], environments: [] } as any,
        t
      )
    ).toEqual([
      {
        key: 'monitor-10',
        name: 'anonymous-worker',
        instance: '无',
        status: '待确认',
        statusTone: 'warning',
        owner: '无',
        system: 'worker',
        environment: '无',
        activity: '搜索结果',
        href: '/entities/discovery?source=telemetry&monitorId=10&action=enrich',
        attributionState: 'review',
        attributionLabel: '归因待补齐',
        attributionCopy: '缺少负责人、环境',
        primaryActionLabel: '补齐归因'
      }
    ]);
  });

  it('uses localized empty values for missing discovery governance cells', () => {
    expect(
      buildDiscoveryTableRows(
        [{ id: 10, name: 'anonymous-worker', app: 'worker', instance: ' ', status: 'mystery' }] as any,
        [] as any,
        { owners: [], systems: [], environments: [] } as any,
        t
      )[0]
    ).toEqual(
      expect.objectContaining({
        name: 'anonymous-worker',
        instance: '无',
        status: '未知状态 mystery',
        owner: '无',
        system: 'worker',
        environment: '无',
        attributionState: 'review'
      })
    );

    expect(
      buildDiscoveryTableRows(
        [],
        [{ id: 'empty-preset', name: ' ', owner: ' ', system: ' ', environment: ' ', status: 'unknown' }] as any,
        { owners: [], systems: [], environments: [] } as any,
        t
      )[0]
    ).toEqual(
      expect.objectContaining({
        name: '无',
        instance: '无',
        status: '未知状态 unknown',
        owner: '无',
        system: '无',
        environment: '无',
        attributionState: 'preset'
      })
    );
  });

  it('builds merge-first governance cards when the telemetry search finds a catalog candidate', () => {
    expect(
      buildDiscoveryGovernanceCards(
        [{ id: 9, name: 'checkout-api', app: 'checkout', instance: '10.0.0.1', status: 0 }] as any,
        [{ id: 'preset-1', name: 'checkout-catalog', owner: 'platform', system: 'checkout', environment: 'prod' }] as any,
        { owners: ['platform'], systems: ['checkout'], environments: ['prod'] } as any,
        t
      )
    ).toEqual([
      expect.objectContaining({
        title: 'checkout-api',
        riskLabel: '治理风险中',
        nextActionLabel: '下一步归并',
        candidateLabel: '建议实体 · checkout-catalog · 匹配强',
        actions: [
          expect.objectContaining({ label: '归并到建议实体', kind: 'primary' }),
          expect.objectContaining({ label: '打开定义', kind: 'secondary' }),
          expect.objectContaining({ label: '打开建议实体', kind: 'secondary' }),
          expect.objectContaining({ label: '作为草稿采用', kind: 'link' })
        ]
      })
    ]);
  });

  it('builds enrich-first governance cards when the telemetry result is missing shared governance context', () => {
    expect(
      buildDiscoveryGovernanceCards(
        [{ id: 10, name: 'anonymous-worker', app: 'worker', instance: '', status: 2 }] as any,
        [] as any,
        { owners: [], systems: [], environments: [] } as any,
        t
      )
    ).toEqual([
      expect.objectContaining({
        title: 'anonymous-worker',
        riskLabel: '治理风险高',
        nextActionLabel: '下一步补齐',
        actions: [
          expect.objectContaining({ label: '复核治理', kind: 'primary' }),
          expect.objectContaining({ label: '送入定义工作台', kind: 'secondary' }),
          expect.objectContaining({ label: '作为草稿采用', kind: 'link' })
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
      { owners: ['platform'], systems: ['checkout', 'inventory'], environments: ['prod'] } as any,
      t
    );

    expect(buildDiscoveryScopeOptions(cards, t)).toEqual([
      { key: 'all', label: '全部', count: 3 },
      { key: 'matched', label: '已匹配', count: 2 },
      { key: 'resolved', label: '已归因', count: 0 },
      { key: 'new', label: '建议新建', count: 1 }
    ]);

    expect(buildDiscoveryIntakeQueueGroups(cards, t)).toEqual([
      expect.objectContaining({
        key: 'merge',
        title: '可归并',
        actionLabel: '选择可归并',
        cardKeys: ['monitor-9', 'monitor-11']
      }),
      expect.objectContaining({
        key: 'create',
        title: '建议新建实体',
        actionLabel: '选择建议新建',
        cardKeys: ['monitor-10']
      }),
      expect.objectContaining({
        key: 'resolved',
        title: '已收口',
        actionLabel: '查看已收口',
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
      { owners: ['platform'], systems: ['checkout'], environments: ['prod'] } as any,
      t
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
      }, t)
    ).toEqual([
      { label: '负责人', value: 'catalog-oncall' },
      { label: '系统', value: 'commerce-platform' }
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
        },
        t
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
          label: '应用 catalog baseline',
          owner: 'catalog-oncall',
          system: 'commerce-platform',
          active: false
        }
      ]
    });
  });
});
