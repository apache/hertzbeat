import { describe, expect, it, vi } from 'vitest';
import { buildDiscoveryMonitorCandidatesUrl, loadDiscoveryData, loadDiscoveryDataFromFacade, searchDiscoveryMonitors } from './controller';

describe('entity discovery controller', () => {
  it('loads presets, activities and catalog suggestions together', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'preset-a' }])
      .mockResolvedValueOnce([{ id: 2, summary: 'activity-a' }])
      .mockResolvedValueOnce({ owners: ['ops'], systems: ['checkout'], environments: ['prod'] });

    const result = await loadDiscoveryData(apiGet as any);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/entities/discovery/governance-presets?limit=8');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/entities/discovery/governance-activities?limit=8');
    expect(apiGet).toHaveBeenNthCalledWith(3, '/entities/catalog-suggestions?limit=120');
    expect(result).toEqual({
      presets: [{ id: 1, name: 'preset-a' }],
      activities: [{ id: 2, summary: 'activity-a' }],
      catalog: { owners: ['ops'], systems: ['checkout'], environments: ['prod'] }
    });
  });

  it('falls back to empty governance rails when the optional discovery endpoints are missing', async () => {
    const apiGet = vi.fn()
      .mockRejectedValueOnce(new Error('GET /entities/discovery/governance-presets?limit=8 failed with 404'))
      .mockRejectedValueOnce(new Error('GET /entities/discovery/governance-activities?limit=8 failed with 404'))
      .mockResolvedValueOnce({ owners: ['ops'], systems: ['checkout'], environments: ['prod'] });

    const result = await loadDiscoveryData(apiGet as any);

    expect(result).toEqual({
      presets: [],
      activities: [],
      catalog: { owners: ['ops'], systems: ['checkout'], environments: ['prod'] }
    });
  });

  it('loads discovery workspace data through the entity facade readers', async () => {
    const readers = {
      presets: vi.fn(async () => [{ id: 1, name: 'preset-a' }]),
      activities: vi.fn(async () => [{ id: 2, summary: 'activity-a' }]),
      catalogSuggestions: vi.fn(async () => ({ owners: ['ops'], systems: ['checkout'], environments: ['prod'] }))
    };

    await expect(loadDiscoveryDataFromFacade(readers as any)).resolves.toEqual({
      presets: [{ id: 1, name: 'preset-a' }],
      activities: [{ id: 2, summary: 'activity-a' }],
      catalog: { owners: ['ops'], systems: ['checkout'], environments: ['prod'] }
    });

    expect(readers.presets).toHaveBeenCalledWith(8);
    expect(readers.activities).toHaveBeenCalledWith(8);
    expect(readers.catalogSuggestions).toHaveBeenCalledWith(120);
  });

  it('preserves discovery fallbacks through the entity facade readers', async () => {
    const readers = {
      presets: vi.fn(async () => {
        throw new Error('GET /entities/discovery/governance-presets?limit=8 failed with 404');
      }),
      activities: vi.fn(async () => {
        throw new Error('GET /entities/discovery/governance-activities?limit=8 failed with 404');
      }),
      catalogSuggestions: vi.fn(async () => {
        throw new Error('GET /entities/catalog-suggestions?limit=120 failed with 404');
      })
    };

    await expect(loadDiscoveryDataFromFacade(readers as any)).resolves.toEqual({
      presets: [],
      activities: [],
      catalog: {
        owners: [],
        namespaces: [],
        environments: [],
        systems: [],
        lifecycles: [],
        tiers: [],
        inheritFromRefs: [],
        entityRefs: [],
        languages: [],
        linkProviders: []
      }
    });
  });

  it('keeps the discovery workspace usable when catalog suggestions are missing', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'preset-a' }])
      .mockResolvedValueOnce([{ id: 2, summary: 'activity-a' }])
      .mockRejectedValueOnce(new Error('GET /entities/catalog-suggestions?limit=120 failed with 404'));

    const result = await loadDiscoveryData(apiGet as any);

    expect(result).toEqual({
      presets: [{ id: 1, name: 'preset-a' }],
      activities: [{ id: 2, summary: 'activity-a' }],
      catalog: {
        owners: [],
        namespaces: [],
        environments: [],
        systems: [],
        lifecycles: [],
        tiers: [],
        inheritFromRefs: [],
        entityRefs: [],
        languages: [],
        linkProviders: []
      }
    });
  });

  it('searches discovery monitors through the monitor search endpoint', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({
        content: [{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 50
      })
      .mockResolvedValueOnce({
        '9': [{ entityId: 42, entityName: 'checkout-entity', alreadyBound: true }]
      });

    const result = await searchDiscoveryMonitors(apiGet as any, ' checkout ');

    expect(apiGet).toHaveBeenNthCalledWith(1, '/monitors?pageIndex=0&pageSize=50&search=checkout');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/entities/monitor/candidates?ids=9');
    expect(result).toEqual({
      monitors: [
        {
          id: 9,
          name: 'checkout-api',
          app: 'springboot3',
          instance: '10.0.0.1',
          status: 0,
          entityBindingCandidates: [{ entityId: 42, entityName: 'checkout-entity', alreadyBound: true }]
        }
      ],
      pageSize: 50,
      pageIndex: 0,
      totalElements: 1
    });
  });

  it('builds a batch monitor candidate lookup url for discovery result rows', () => {
    expect(buildDiscoveryMonitorCandidatesUrl([{ id: 9 }, { id: 10 }] as any)).toBe('/entities/monitor/candidates?ids=9&ids=10');
  });

  it('uses one batch candidate lookup for multiple discovery monitor rows', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({
        content: [
          { id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 },
          { id: 10, name: 'payment-api', app: 'springboot3', instance: '10.0.0.2', status: 0 }
        ],
        totalElements: 2,
        pageIndex: 0,
        pageSize: 50
      })
      .mockResolvedValueOnce({
        '9': [{ entityId: 42, entityName: 'checkout-entity', alreadyBound: true }],
        '10': []
      });

    const result = await searchDiscoveryMonitors(apiGet as any, ' api ');

    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(apiGet).toHaveBeenNthCalledWith(2, '/entities/monitor/candidates?ids=9&ids=10');
    expect(result.monitors[0]?.entityBindingCandidates).toEqual([{ entityId: 42, entityName: 'checkout-entity', alreadyBound: true }]);
    expect(result.monitors[1]?.entityBindingCandidates).toEqual([]);
  });

  it('searches later discovery monitor pages without losing batch candidate lookup', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({
        content: [{ id: 59, name: 'overflow-api', app: 'website', instance: '10.0.0.59', status: 0 }],
        totalElements: 60,
        pageIndex: 1,
        pageSize: 50
      })
      .mockResolvedValueOnce({ '59': [] });

    const result = await searchDiscoveryMonitors(apiGet as any, ' overflow ', 1);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/monitors?pageIndex=1&pageSize=50&search=overflow');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/entities/monitor/candidates?ids=59');
    expect(result).toEqual({
      monitors: [{ id: 59, name: 'overflow-api', app: 'website', instance: '10.0.0.59', status: 0, entityBindingCandidates: [] }],
      pageSize: 50,
      pageIndex: 1,
      totalElements: 60
    });
  });

  it('keeps discovery monitor search usable when binding candidate lookup fails', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({
        content: [{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 50
      })
      .mockRejectedValueOnce(new Error('GET /entities/monitor/candidates failed with 404'))
      .mockRejectedValueOnce(new Error('GET /entities/monitor/9/candidates failed with 404'));

    const result = await searchDiscoveryMonitors(apiGet as any, ' checkout ');

    expect(apiGet).toHaveBeenNthCalledWith(1, '/monitors?pageIndex=0&pageSize=50&search=checkout');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/entities/monitor/candidates?ids=9');
    expect(apiGet).toHaveBeenNthCalledWith(3, '/entities/monitor/9/candidates');
    expect(result).toEqual({
      monitors: [{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }],
      pageSize: 50,
      pageIndex: 0,
      totalElements: 1
    });
  });

  it('preserves backend total count when discovery monitor results are capped', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({
        content: [{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }],
        totalElements: 60,
        pageIndex: 0,
        pageSize: 50
      })
      .mockResolvedValueOnce({ '9': [] });

    const result = await searchDiscoveryMonitors(apiGet as any, ' checkout ');

    expect(result.monitors).toHaveLength(1);
    expect(result.totalElements).toBe(60);
    expect(result.pageSize).toBe(50);
    expect(result.pageIndex).toBe(0);
  });

  it('caps oversized discovery monitor payloads before building row candidate lookups', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({
        content: Array.from({ length: 120 }, (_, index) => ({
          id: index + 1,
          name: `scale-monitor-${index + 1}`,
          app: 'website',
          instance: `10.0.0.${index + 1}`,
          status: 0
        })),
        totalElements: 120,
        pageIndex: 0,
        pageSize: 120
      })
      .mockResolvedValueOnce({});

    const result = await searchDiscoveryMonitors(apiGet as any, ' scale ');
    const candidateLookupUrl = String(apiGet.mock.calls[1]?.[0] ?? '');

    expect(result.monitors).toHaveLength(50);
    expect(result.monitors[0]?.name).toBe('scale-monitor-1');
    expect(result.monitors.at(-1)?.name).toBe('scale-monitor-50');
    expect(result.monitors.some(monitor => monitor.name === 'scale-monitor-51')).toBe(false);
    expect(result.totalElements).toBe(120);
    expect(result.pageSize).toBe(50);
    expect(candidateLookupUrl).toContain('/entities/monitor/candidates?');
    expect(candidateLookupUrl).toContain('ids=50');
    expect(candidateLookupUrl).not.toContain('ids=51');
  });

  it('keeps discovery idle when the search query is blank', async () => {
    const apiGet = vi.fn();

    const result = await searchDiscoveryMonitors(apiGet as any, '   ');

    expect(apiGet).not.toHaveBeenCalled();
    expect(result).toEqual({ monitors: [], totalElements: 0, pageSize: 50, pageIndex: 0 });
  });
});
