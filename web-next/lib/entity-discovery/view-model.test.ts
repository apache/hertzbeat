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
      { label: t('entities.discovery.facts.workspace'), value: 'entities/discovery' },
      { label: t('entities.discovery.facts.presets'), value: '2' },
      { label: t('entities.discovery.facts.activities'), value: '2' },
      { label: t('entities.discovery.facts.owners'), value: '2' }
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
      { label: t('entities.discovery.metrics.owners'), value: '1' },
      { label: t('entities.discovery.metrics.systems'), value: '2' },
      { label: t('entities.discovery.metrics.environments'), value: '1' },
      {
        label: t('entities.discovery.metrics.preset-coverage'),
        value: t('entities.discovery.metrics.ready'),
        tone: 'success'
      }
    ]);
  });

  it('builds catalog rows', () => {
    expect(
      buildCatalogRows({ owners: ['ops'], systems: ['checkout'], environments: ['prod'] } as any, t)
    ).toEqual([
      { title: t('entities.discovery.catalog.owners'), copy: 'ops', meta: t('entities.discovery.catalog.count', { count: 1 }) },
      { title: t('entities.discovery.catalog.systems'), copy: 'checkout', meta: t('entities.discovery.catalog.count', { count: 1 }) },
      { title: t('entities.discovery.catalog.environments'), copy: 'prod', meta: t('entities.discovery.catalog.count', { count: 1 }) }
    ]);
  });

  it('builds discovery monitor rows for the telemetry search results console', () => {
    expect(
      buildDiscoveryMonitorRows([{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }] as any, t)
    ).toEqual([
      {
        title: 'checkout-api',
        copy: 'springboot3 · 10.0.0.1',
        meta: `#9 · ${t('entities.discovery.row.status.normal')}`
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
        status: t('entities.discovery.row.status.enabled'),
        statusTone: 'success',
        owner: 'platform',
        system: 'checkout',
        environment: 'prod',
        activity: t('entities.discovery.row.activity.catalog-preset'),
        href: '/entities/discovery?preset=preset-1',
        attributionState: 'preset',
        attributionLabel: t('entities.discovery.row.attribution.preset.label'),
        attributionCopy: t('entities.discovery.row.attribution.preset.copy'),
        primaryActionLabel: t('entities.discovery.row.attribution.preset.action')
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
        status: t('entities.discovery.row.status.normal'),
        statusTone: 'success',
        owner: 'platform',
        system: 'springboot3',
        environment: 'prod',
        activity: t('entities.discovery.row.activity.search-result'),
        href: '/entities?search=10.0.0.1&source=discovery-candidate&monitorId=9&monitorName=checkout-api&monitorApp=springboot3&monitorInstance=10.0.0.1',
        attributionState: 'merge',
        attributionLabel: t('entities.discovery.row.attribution.merge.label'),
        attributionCopy: t('entities.discovery.row.attribution.merge.copy', { candidate: 'spring catalog' }),
        primaryActionLabel: t('entities.discovery.row.attribution.merge.action')
      }
    ]);
  });

  it('keeps missing monitor host evidence readable in discovery table rows', () => {
    const [row] = buildDiscoveryTableRows(
      [{ id: 1370, name: 'import-export-source', app: 'website', instance: 'null:4223', status: 2 }] as any,
      [{ id: 'preset-1', name: 'website service', owner: 'platform', system: 'website', environment: 'prod' }] as any,
      { owners: ['ops'], systems: ['website'], environments: ['prod'] } as any,
      t
    );

    expect(row.instance).toBe(t('entities.discovery.row.instance.missing-host-port', { port: '4223' }));
    expect(row.instance).not.toContain('null');

    const href = new URL(row.href, 'https://hertzbeat.local');
    expect(href.pathname).toBe('/entities');
    expect(href.searchParams.get('search')).toBe('import-export-source');
    expect(href.searchParams.get('monitorApp')).toBe('website');
    expect(href.searchParams.has('monitorInstance')).toBe(false);
    expect(row.href).not.toContain('null%3A4223');
    expect(row.href).not.toContain('null:4223');
  });

  it('omits dirty missing-host instances from resolved entity links', () => {
    const [row] = buildDiscoveryTableRows(
      [
        {
          id: 1370,
          name: 'import-export-source',
          app: 'website',
          instance: 'undefined:4223',
          status: 2,
          entityBindingCandidates: [{ entityId: 42, entityName: 'import-export-entity', alreadyBound: true }]
        }
      ] as any,
      [{ id: 'preset-1', name: 'website service', owner: 'platform', system: 'website', environment: 'prod' }] as any,
      { owners: ['ops'], systems: ['website'], environments: ['prod'] } as any,
      t
    );

    const href = new URL(row.href, 'https://hertzbeat.local');
    expect(href.pathname).toBe('/entities/42');
    expect(href.searchParams.get('monitorName')).toBe('import-export-source');
    expect(href.searchParams.has('monitorInstance')).toBe(false);
    expect(row.href).not.toContain('undefined%3A4223');
    expect(row.href).not.toContain('undefined:4223');
  });

  it('marks searched monitors with existing entity bindings as resolved and opens the bound entity', () => {
    expect(
      buildDiscoveryTableRows(
        [
          {
            id: 9,
            name: 'checkout-api',
            app: 'springboot3',
            instance: '10.0.0.1',
            status: 0,
            entityBindingCandidates: [{ entityId: 42, entityName: 'checkout-entity', alreadyBound: true }]
          }
        ] as any,
        [{ id: 'preset-1', name: 'spring catalog', owner: 'platform', system: 'springboot3', environment: 'prod' }] as any,
        { owners: ['ops'], systems: ['checkout'], environments: ['prod'] } as any,
        t
      )
    ).toEqual([
      expect.objectContaining({
        href: '/entities/42?source=discovery-candidate&monitorId=9&monitorName=checkout-api&monitorApp=springboot3&monitorInstance=10.0.0.1',
        attributionState: 'resolved',
        attributionLabel: t('entities.discovery.row.attribution.resolved.label'),
        attributionCopy: t('entities.discovery.row.attribution.resolved.bound-copy', { entity: 'checkout-entity' }),
        primaryActionLabel: t('entities.discovery.row.attribution.resolved.action')
      })
    ]);
  });

  it('keeps discovery search return context on resolved monitor entity links', () => {
    const row = buildDiscoveryTableRows(
      [
        {
          id: 9,
          name: 'checkout-api',
          app: 'springboot3',
          instance: '10.0.0.1',
          status: 0,
          entityBindingCandidates: [{ entityId: 42, entityName: 'checkout-entity', alreadyBound: true }]
        }
      ] as any,
      [] as any,
      { owners: [], systems: [], environments: [] } as any,
      t,
      { returnTo: '/entities/discovery?search=checkout-api' }
    )[0];

    const href = new URL(row.href, 'https://hertzbeat.local');
    expect(href.pathname).toBe('/entities/42');
    expect(href.searchParams.get('returnTo')).toBe('/entities/discovery?search=checkout-api');
  });

  it('keeps discovery search return context on candidate search links', () => {
    const row = buildDiscoveryTableRows(
      [{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }] as any,
      [{ id: 'preset-1', name: 'spring catalog', owner: 'platform', system: 'springboot3', environment: 'prod' }] as any,
      { owners: ['ops'], systems: ['checkout'], environments: ['prod'] } as any,
      t,
      { returnTo: '/entities/discovery?search=checkout-api' }
    )[0];

    const href = new URL(row.href, 'https://hertzbeat.local');
    expect(href.pathname).toBe('/entities');
    expect(href.searchParams.get('returnTo')).toBe('/entities/discovery?search=checkout-api');
  });

  it('keeps discovery search return context on suggested new entity draft links', () => {
    const row = buildDiscoveryTableRows(
      [{ id: 10, name: 'Codex Website Probe', app: 'website', instance: '127.0.0.1:4225', status: 0 }] as any,
      [] as any,
      { owners: ['platform'], systems: [], environments: ['prod'] } as any,
      t,
      { returnTo: '/entities/discovery?search=codex&pageIndex=1' }
    )[0];

    const href = new URL(row.href, 'https://hertzbeat.local');
    expect(href.pathname).toBe('/entities/new');
    expect(href.searchParams.get('source')).toBe('telemetry');
    expect(href.searchParams.get('monitorId')).toBe('10');
    expect(href.searchParams.get('monitorName')).toBe('Codex Website Probe');
    expect(href.searchParams.get('monitorApp')).toBe('website');
    expect(href.searchParams.get('monitorInstance')).toBe('127.0.0.1:4225');
    expect(href.searchParams.get('returnTo')).toBe('/entities/discovery?search=codex&pageIndex=1');
  });

  it('searches discovery candidate lists by monitor instance before broad app name', () => {
    const row = buildDiscoveryTableRows(
      [{ id: 10, name: 'Codex Website Probe', app: 'website', instance: '127.0.0.1:4225', status: 0 }] as any,
      [{ id: 'preset-1', name: 'website catalog', owner: 'platform', system: 'website', environment: 'prod' }] as any,
      { owners: ['platform'], systems: ['website'], environments: ['prod'] } as any,
      t
    )[0];

    const href = new URL(row.href, 'https://hertzbeat.local');
    expect(href.pathname).toBe('/entities');
    expect(href.searchParams.get('search')).toBe('127.0.0.1:4225');
    expect(href.searchParams.get('monitorApp')).toBe('website');
    expect(href.searchParams.get('monitorInstance')).toBe('127.0.0.1:4225');
  });

  it('keeps current monitor status 1 aligned with the monitor center healthy state', () => {
    expect(
      buildDiscoveryTableRows(
        [{ id: 10, name: 'website-up', app: 'website', instance: '127.0.0.1:4223', status: 1 }] as any,
        [] as any,
        { owners: [], systems: [], environments: [] } as any,
        t
      )[0]
    ).toEqual(
      expect.objectContaining({
        status: t('entities.discovery.row.status.normal'),
        statusTone: 'success'
      })
    );
  });

  it('localizes fallback service names for discovered merge candidates and draft cards', () => {
    const monitors = [{ id: 11, name: 'node-worker', app: 'node_worker', instance: '10.0.0.2', status: 0 }] as any;
    const catalog = { owners: ['platform'], systems: ['node_worker'], environments: ['prod'] } as any;

    expect(buildDiscoveryTableRows(monitors, [], catalog, t)[0]).toEqual(
      expect.objectContaining({
        attributionState: 'merge',
        attributionCopy: t('entities.discovery.row.attribution.merge.copy', {
          candidate: t('entities.discovery.service-name', { name: 'node_worker' })
        })
      })
    );

    expect(buildDiscoveryGovernanceCards(monitors, [], catalog, t)[0]).toEqual(
      expect.objectContaining({
        draftTitle: t('entities.discovery.service-name', { name: 'node-worker' }),
        candidateLabel: t('entities.discovery.card.candidate-label', {
          candidate: t('entities.discovery.service-name', { name: 'node_worker' })
        })
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
        meta: `#12 · queue · ${t('common.none')}`,
        draftSubtitle: `${t('common.none')} · queue · ${t('common.none')}`,
        candidateContext: `${t('common.none')} · queue · ${t('common.none')}`
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
        instance: t('common.none'),
        status: t('entities.discovery.row.status.abnormal'),
        statusTone: 'critical',
        owner: t('common.none'),
        system: 'worker',
        environment: t('common.none'),
        activity: t('entities.discovery.row.activity.search-result'),
        href: '/entities/new?source=telemetry&monitorId=10&monitorName=anonymous-worker&monitorApp=worker',
        attributionState: 'review',
        attributionLabel: t('entities.discovery.row.attribution.review.label'),
        attributionCopy: t('entities.discovery.row.missing.copy', {
          fields: [
            t('entities.discovery.row.missing.owner'),
            t('entities.discovery.row.missing.environment')
          ].join(t('entities.discovery.row.missing.separator'))
        }),
        primaryActionLabel: t('entities.discovery.row.attribution.review.action')
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
        instance: t('common.none'),
        status: t('entities.discovery.row.status.unknown', { status: 'mystery' }),
        owner: t('common.none'),
        system: 'worker',
        environment: t('common.none'),
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
        name: t('common.none'),
        instance: t('common.none'),
        status: t('entities.discovery.row.status.unknown', { status: 'unknown' }),
        owner: t('common.none'),
        system: t('common.none'),
        environment: t('common.none'),
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
        riskLabel: t('entities.discovery.card.risk.medium'),
        nextActionLabel: t('entities.discovery.card.next.merge'),
        candidateLabel: t('entities.discovery.card.candidate-label', { candidate: 'checkout-catalog' }),
        actions: [
          expect.objectContaining({
            label: t('entities.discovery.card.action.merge-suggested'),
            href: '/entities?search=10.0.0.1&source=discovery-candidate&monitorId=9&monitorName=checkout-api&monitorApp=checkout&monitorInstance=10.0.0.1',
            kind: 'primary'
          }),
          expect.objectContaining({ label: t('entities.discovery.card.action.open-definition'), kind: 'secondary' }),
          expect.objectContaining({ label: t('entities.discovery.card.action.open-suggested'), kind: 'secondary' }),
          expect.objectContaining({ label: t('entities.discovery.card.action.adopt-draft'), kind: 'link' })
        ]
      })
    ]);
  });

  it('builds resolved governance cards when the telemetry monitor is already bound', () => {
    expect(
      buildDiscoveryGovernanceCards(
        [
          {
            id: 9,
            name: 'checkout-api',
            app: 'checkout',
            instance: '10.0.0.1',
            status: 0,
            entityBindingCandidates: [{ entityId: 42, entityName: 'checkout-entity', alreadyBound: true }]
          }
        ] as any,
        [{ id: 'preset-1', name: 'checkout-catalog', owner: 'platform', system: 'checkout', environment: 'prod' }] as any,
        { owners: ['platform'], systems: ['checkout'], environments: ['prod'] } as any,
        t
      )
    ).toEqual([
      expect.objectContaining({
        title: 'checkout-api',
        state: 'resolved',
        riskLabel: t('entities.discovery.card.risk.low'),
        nextActionLabel: t('entities.discovery.card.next.open'),
        candidateLabel: t('entities.discovery.card.resolved-label', { entity: 'checkout-entity' }),
        actions: [
          expect.objectContaining({
            label: t('entities.discovery.card.action.open-resolved'),
            href: '/entities/42?source=discovery-candidate&monitorId=9&monitorName=checkout-api&monitorApp=checkout&monitorInstance=10.0.0.1',
            kind: 'primary'
          }),
          expect.objectContaining({ label: t('entities.discovery.card.action.open-definition'), kind: 'secondary' })
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
        riskLabel: t('entities.discovery.card.risk.high'),
        nextActionLabel: t('entities.discovery.card.next.enrich'),
        actions: [
          expect.objectContaining({ label: t('entities.discovery.card.action.review-governance'), kind: 'primary' }),
          expect.objectContaining({ label: t('entities.discovery.card.action.send-definition'), kind: 'secondary' }),
          expect.objectContaining({ label: t('entities.discovery.card.action.adopt-draft'), kind: 'link' })
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
      { key: 'all', label: t('entities.discovery.scope.all'), count: 3 },
      { key: 'matched', label: t('entities.discovery.scope.matched'), count: 2 },
      { key: 'resolved', label: t('entities.discovery.scope.resolved'), count: 0 },
      { key: 'new', label: t('entities.discovery.scope.suggested-new'), count: 1 }
    ]);

    expect(buildDiscoveryIntakeQueueGroups(cards, t)).toEqual([
      expect.objectContaining({
        key: 'merge',
        title: t('entities.discovery.queue.merge.title'),
        actionLabel: t('entities.discovery.queue.merge.action'),
        cardKeys: ['monitor-9', 'monitor-11']
      }),
      expect.objectContaining({
        key: 'create',
        title: t('entities.discovery.queue.create.title'),
        actionLabel: t('entities.discovery.queue.create.action'),
        cardKeys: ['monitor-10']
      }),
      expect.objectContaining({
        key: 'resolved',
        title: t('entities.discovery.queue.resolved.title'),
        actionLabel: t('entities.discovery.queue.resolved.action'),
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
      { label: t('entities.discovery.bulk.tag.owner'), value: 'catalog-oncall' },
      { label: t('entities.discovery.bulk.tag.system'), value: 'commerce-platform' }
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
          label: t('entities.discovery.bulk.preset.apply', { name: 'catalog baseline' }),
          owner: 'catalog-oncall',
          system: 'commerce-platform',
          active: false
        }
      ]
    });
  });
});
