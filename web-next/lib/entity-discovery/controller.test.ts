import { describe, expect, it, vi } from 'vitest';
import { loadDiscoveryData, loadDiscoveryDataFromFacade, searchDiscoveryMonitors } from './controller';

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
    const apiGet = vi.fn().mockResolvedValue({
      content: [{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    });

    const result = await searchDiscoveryMonitors(apiGet as any, ' checkout ');

    expect(apiGet).toHaveBeenCalledWith('/monitors?pageIndex=0&pageSize=8&search=checkout');
    expect(result).toEqual([{ id: 9, name: 'checkout-api', app: 'springboot3', instance: '10.0.0.1', status: 0 }]);
  });

  it('keeps discovery idle when the search query is blank', async () => {
    const apiGet = vi.fn();

    const result = await searchDiscoveryMonitors(apiGet as any, '   ');

    expect(apiGet).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
