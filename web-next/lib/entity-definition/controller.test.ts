import { describe, expect, it, vi } from 'vitest';
import { loadEntityDefinitionPageData, loadEntityDefinitionPageDataFromFacade, updateDefinitionPayload } from './controller';

describe('entity definition controller', () => {
  it('loads definition, activities and templates together', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce('kind: service')
      .mockResolvedValueOnce([{ id: 1, summary: 'updated definition' }])
      .mockResolvedValueOnce([{ id: 2, name: 'base-template' }]);

    const result = await loadEntityDefinitionPageData(apiGet as any, '42', 'yaml');

    expect(apiGet).toHaveBeenNthCalledWith(1, '/entities/42/definition?format=yaml');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/entities/definition-activities?entityId=42&limit=8');
    expect(apiGet).toHaveBeenNthCalledWith(3, '/entities/definition/templates?limit=8');
    expect(result).toEqual({
      definition: 'kind: service',
      loadMessage: null,
      activities: [{ id: 1, summary: 'updated definition' }],
      templates: [{ id: 2, name: 'base-template' }],
      entityId: '42'
    });
  });

  it('falls back to a generated definition shell when entity definition helpers are unavailable', async () => {
    const apiGet = vi.fn()
      .mockRejectedValueOnce(new Error('GET /entities/42/definition failed with 404'))
      .mockRejectedValueOnce(new Error('GET /entities/definition-activities failed with ECONNRESET'))
      .mockRejectedValueOnce(new Error('GET /entities/definition/templates failed with 404'));

    const result = await loadEntityDefinitionPageData(apiGet as any, '42', 'yaml');

    expect(result).toEqual({
      definition: [
        'apiVersion: hertzbeat.apache.org/v1',
        'kind: Entity',
        'metadata:',
        '  name: entity-42',
        'spec:',
        '  type: service',
        '  displayName: Entity 42',
        '  owner: platform',
        '  system: catalog',
        '  environment: prod',
        '  source: manual'
      ].join('\n'),
      loadMessage: null,
      activities: [],
      templates: [],
      entityId: '42'
    });
  });

  it('loads definition workspace data through the entity facade readers', async () => {
    const readers = {
      definition: vi.fn(async () => 'kind: service'),
      activities: vi.fn(async () => [{ id: 1, summary: 'updated definition' }]),
      templates: vi.fn(async () => [{ id: 2, name: 'base-template' }])
    };

    await expect(loadEntityDefinitionPageDataFromFacade(readers as any, '42', 'yaml')).resolves.toEqual({
      definition: 'kind: service',
      loadMessage: null,
      activities: [{ id: 1, summary: 'updated definition' }],
      templates: [{ id: 2, name: 'base-template' }],
      entityId: '42'
    });

    expect(readers.definition).toHaveBeenCalledWith('42', 'yaml');
    expect(readers.activities).toHaveBeenCalledWith('42', 8);
    expect(readers.templates).toHaveBeenCalledWith(8);
  });

  it('preserves definition fallback behavior through the entity facade readers', async () => {
    const readers = {
      definition: vi.fn(async () => {
        throw new Error('GET /entities/42/definition failed with 404');
      }),
      activities: vi.fn(async () => {
        throw new Error('GET /entities/definition-activities failed with ECONNRESET');
      }),
      templates: vi.fn(async () => {
        throw new Error('GET /entities/definition/templates failed with 404');
      })
    };

    const result = await loadEntityDefinitionPageDataFromFacade(readers as any, '42', 'yaml');

    expect(result.definition).toContain('name: entity-42');
    expect(result.loadMessage).toBeNull();
    expect(result.activities).toEqual([]);
    expect(result.templates).toEqual([]);
  });

  it('treats the legacy Entity not exist response as recoverable while preserving Angular empty-error editor state', async () => {
    const apiGet = vi.fn()
      .mockRejectedValueOnce(new Error('Entity not exist.'))
      .mockRejectedValueOnce(new Error('Entity not exist.'))
      .mockRejectedValueOnce(new Error('Entity not exist.'));

    const result = await loadEntityDefinitionPageData(apiGet as any, '1', 'yaml');

    expect(result.definition).toBe('');
    expect(result.loadMessage).toBe('Entity not exist.');
    expect(result.activities).toEqual([]);
    expect(result.templates).toEqual([]);
    expect(result.entityId).toBe('1');
  });

  it('preserves the legacy Entity not exist empty-error state through the entity facade readers', async () => {
    const readers = {
      definition: vi.fn(async () => {
        throw new Error('Entity not exist.');
      }),
      activities: vi.fn(async () => {
        throw new Error('Entity not exist.');
      }),
      templates: vi.fn(async () => {
        throw new Error('Entity not exist.');
      })
    };

    const result = await loadEntityDefinitionPageDataFromFacade(readers as any, '1', 'yaml');

    expect(result.definition).toBe('');
    expect(result.loadMessage).toBe('Entity not exist.');
    expect(result.activities).toEqual([]);
    expect(result.templates).toEqual([]);
    expect(result.entityId).toBe('1');
  });

  it('builds update payload from content and format', () => {
    expect(updateDefinitionPayload('kind: service', 'curl')).toEqual({
      content: 'kind: service',
      format: 'curl'
    });
  });
});
