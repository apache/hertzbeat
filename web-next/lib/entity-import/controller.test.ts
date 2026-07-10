import { describe, expect, it, vi } from 'vitest';
import { buildDefinitionRequest, createDefinitionBundle, loadImportData, loadImportDataFromFacade, parseDefinitionBundle } from './controller';

describe('entity import controller', () => {
  it('loads templates and activities together', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'base-template' }])
      .mockResolvedValueOnce([{ id: 2, summary: 'imported service' }]);

    const result = await loadImportData(apiGet as any);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/entities/definition/templates?limit=8');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/entities/definition-activities?limit=8');
    expect(result).toEqual({
      templates: [{ id: 1, name: 'base-template' }],
      activities: [{ id: 2, summary: 'imported service' }]
    });
  });

  it('falls back to an empty import workspace when helper endpoints are unavailable', async () => {
    const apiGet = vi.fn()
      .mockRejectedValueOnce(new Error('GET /entities/definition/templates failed with 404'))
      .mockRejectedValueOnce(new Error('Backend service unavailable. Please retry after the backend service is restored.'));

    const result = await loadImportData(apiGet as any);

    expect(result).toEqual({
      templates: [],
      activities: []
    });
  });

  it('loads import workspace data through the entity facade readers', async () => {
    const readers = {
      templates: vi.fn(async () => [{ id: 1, name: 'base-template' }]),
      activities: vi.fn(async () => [{ id: 2, summary: 'imported service' }])
    };

    await expect(loadImportDataFromFacade(readers as any)).resolves.toEqual({
      templates: [{ id: 1, name: 'base-template' }],
      activities: [{ id: 2, summary: 'imported service' }]
    });

    expect(readers.templates).toHaveBeenCalledWith(8);
    expect(readers.activities).toHaveBeenCalledWith(8);
  });

  it('preserves the empty import workspace fallback through the entity facade readers', async () => {
    const readers = {
      templates: vi.fn(async () => {
        throw new Error('GET /entities/definition/templates failed with API request failed: 503');
      }),
      activities: vi.fn(async () => {
        throw new Error('GET /entities/definition-activities failed with ECONNRESET');
      })
    };

    await expect(loadImportDataFromFacade(readers as any)).resolves.toEqual({
      templates: [],
      activities: []
    });
  });

  it('builds a definition request from content and format', () => {
    expect(buildDefinitionRequest('kind: service', 'yaml')).toEqual({
      content: 'kind: service',
      format: 'yaml'
    });
  });

  it('parses definition bundles through the shared batch endpoint', async () => {
    const apiPost = vi.fn().mockResolvedValue([{ entity: { name: 'checkout-api' } }]);

    const result = await parseDefinitionBundle(apiPost, 'kind: service', 'yaml');

    expect(apiPost).toHaveBeenCalledWith('/entities/definition/bundle/parse', {
      content: 'kind: service',
      format: 'yaml'
    });
    expect(result).toEqual([{ entity: { name: 'checkout-api' } }]);
  });

  it('creates definition bundles through the shared batch endpoint', async () => {
    const apiPost = vi.fn().mockResolvedValue([42, 43]);

    const result = await createDefinitionBundle(apiPost, 'kind: service', 'curl');

    expect(apiPost).toHaveBeenCalledWith('/entities/definition/bundle', {
      content: 'kind: service',
      format: 'curl'
    });
    expect(result).toEqual([42, 43]);
  });
});
