import { describe, expect, it, vi } from 'vitest';
import { buildEmptyEntityListPage, loadEntityList, loadEntityListFromFacade } from './controller';

describe('entity-manage controller', () => {
  it('returns a current empty page when the entity list endpoint is absent', async () => {
    const apiGet = vi.fn(async () => {
      throw new Error('API request failed: 404');
    });

    await expect(loadEntityList(apiGet as any, { search: '', type: '', status: '' })).resolves.toEqual(
      buildEmptyEntityListPage()
    );

    expect(apiGet).toHaveBeenCalledWith('/entities?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc');
  });

  it('loads the entity list through the domain facade reader', async () => {
    const query = { search: 'checkout', type: 'service', status: 'healthy' };
    const readEntityList = vi.fn().mockResolvedValue({ content: [{ entity: { id: 42 } }], totalElements: 1 });

    await expect(loadEntityListFromFacade(readEntityList as any, query)).resolves.toEqual({
      content: [{ entity: { id: 42 } }],
      totalElements: 1
    });

    expect(readEntityList).toHaveBeenCalledWith(query);
  });

  it('keeps the empty page fallback when the facade list reader reports 404', async () => {
    const readEntityList = vi.fn(async () => {
      throw new Error('API request failed: 404');
    });

    await expect(loadEntityListFromFacade(readEntityList as any, { search: '', type: '', status: '' })).resolves.toEqual(
      buildEmptyEntityListPage()
    );
  });

  it('rethrows non-404 failures from the entity list endpoint', async () => {
    const apiGet = vi.fn(async () => {
      throw new Error('API request failed: 500');
    });

    await expect(loadEntityList(apiGet as any, { search: '', type: '', status: '' })).rejects.toThrow(
      'API request failed: 500'
    );
  });
});
