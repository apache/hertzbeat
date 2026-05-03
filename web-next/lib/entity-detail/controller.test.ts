import { describe, expect, it, vi } from 'vitest';
import { buildEntityDetailUrl, buildFallbackEntityDetail, loadEntityDetail } from './controller';

describe('entity detail controller', () => {
  it('builds the entity detail url', () => {
    expect(buildEntityDetailUrl('123')).toBe('/entities/123/detail');
  });

  it('loads entity detail from the existing endpoint', async () => {
    const apiGet = vi.fn().mockResolvedValue({ entity: { entity: { id: 123 } } });
    const result = await loadEntityDetail(apiGet as any, '123');
    expect(apiGet).toHaveBeenCalledWith('/entities/123/detail');
    expect(result).toEqual({ entity: { entity: { id: 123 } } });
  });

  it('falls back to a generated detail workspace when the endpoint is unavailable', async () => {
    const apiGet = vi.fn().mockRejectedValue(new Error('GET /entities/123/detail failed with 404'));

    await expect(loadEntityDetail(apiGet as any, '123')).resolves.toEqual(buildFallbackEntityDetail('123'));
  });

  it('treats the legacy Entity not exist response as a recoverable detail fallback', async () => {
    const apiGet = vi.fn().mockRejectedValue(new Error('Entity not exist.'));

    await expect(loadEntityDetail(apiGet as any, '123')).resolves.toEqual(buildFallbackEntityDetail('123'));
  });
});
