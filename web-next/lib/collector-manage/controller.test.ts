import { describe, expect, it, vi } from 'vitest';
import { loadCollectorData } from './controller';

describe('collector controller', () => {
  it('loads collector list from the existing endpoint', async () => {
    const apiGet = vi.fn().mockResolvedValue({ content: [], totalElements: 0 });
    const result = await loadCollectorData(apiGet as any, { search: '' });
    expect(apiGet).toHaveBeenCalledWith('/collector?pageIndex=0&pageSize=8');
    expect(result).toEqual({ list: { content: [], totalElements: 0 } });
  });
});
