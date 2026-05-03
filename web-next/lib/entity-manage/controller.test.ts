import { describe, expect, it, vi } from 'vitest';
import { buildEmptyEntityListPage, loadEntityList } from './controller';

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

  it('rethrows non-404 failures from the entity list endpoint', async () => {
    const apiGet = vi.fn(async () => {
      throw new Error('API request failed: 500');
    });

    await expect(loadEntityList(apiGet as any, { search: '', type: '', status: '' })).rejects.toThrow(
      'API request failed: 500'
    );
  });
});
