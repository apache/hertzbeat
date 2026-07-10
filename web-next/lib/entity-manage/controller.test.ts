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

  it('trims oversized facade entity payloads to the normalized page size before UI rendering', async () => {
    const query = { search: 'checkout', type: '', status: '', pageSize: '20' };
    const oversizedContent = Array.from({ length: 40 }, (_, index) => ({ entity: { id: index + 1, name: `checkout-${index}` } }));
    const readEntityList = vi.fn().mockResolvedValue({
      content: oversizedContent,
      totalElements: 200,
      pageIndex: 0,
      pageSize: 20
    });

    await expect(loadEntityListFromFacade(readEntityList as any, query)).resolves.toEqual({
      content: oversizedContent.slice(0, 20),
      totalElements: 200,
      pageIndex: 0,
      pageSize: 20,
      contentTrim: {
        received: 40,
        rendered: 20
      }
    });
  });

  it('trims oversized API entity payloads to the supported fallback page size', async () => {
    const oversizedContent = Array.from({ length: 40 }, (_, index) => ({ entity: { id: index + 1, name: `manual-${index}` } }));
    const apiGet = vi.fn().mockResolvedValue({
      content: oversizedContent,
      totalElements: 40,
      pageIndex: 0,
      pageSize: 1000
    });

    await expect(loadEntityList(apiGet as any, { search: '', type: '', status: '', pageSize: '1000' })).resolves.toEqual({
      content: oversizedContent.slice(0, 8),
      totalElements: 40,
      pageIndex: 0,
      pageSize: 8,
      contentTrim: {
        received: 40,
        rendered: 8
      }
    });
    expect(apiGet).toHaveBeenCalledWith('/entities?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc');
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
