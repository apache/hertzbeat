import { describe, expect, it, vi } from 'vitest';
import { buildGenerateTokenUrl, deleteTokenById, generateTokenValue, loadTokenData } from './controller';

describe('setting token controller', () => {
  it('loads tokens from the auth token API', async () => {
    const apiGet = vi.fn().mockResolvedValue([{ id: 1, name: 'otlp-token' }]);

    const result = await loadTokenData(apiGet as any);

    expect(apiGet).toHaveBeenCalledWith('/account/token');
    expect(result).toEqual({ tokens: [{ id: 1, name: 'otlp-token' }] });
  });

  it('builds generate url with optional expire seconds', () => {
    expect(buildGenerateTokenUrl('OTLP', '604800')).toBe('/account/token/generate?name=OTLP&expireSeconds=604800');
    expect(buildGenerateTokenUrl('OTLP', '-1')).toBe('/account/token/generate?name=OTLP&expireSeconds=-1');
  });

  it('returns the token value from the generate endpoint', async () => {
    const apiGet = vi.fn().mockResolvedValue({ code: 0, data: { token: 'hb_xxx' } });

    await expect(generateTokenValue(apiGet as any, 'OTLP', '604800', 'Generate failed')).resolves.toBe('hb_xxx');
  });

  it('throws the backend or translated failure message when generation fails', async () => {
    const apiGet = vi.fn().mockResolvedValue({ code: 1, msg: 'bad request' });
    await expect(generateTokenValue(apiGet as any, 'OTLP', '604800', 'Generate failed')).rejects.toThrow('bad request');
  });

  it('deletes tokens through the Angular account token delete endpoint', async () => {
    const apiDelete = vi.fn().mockResolvedValue({ code: 0 });

    await expect(deleteTokenById(apiDelete as any, 7, 'Delete failed')).resolves.toBeUndefined();

    expect(apiDelete).toHaveBeenCalledWith('/account/token/7');
  });

  it('throws the backend or translated failure message when token deletion fails', async () => {
    const apiDelete = vi.fn().mockResolvedValue({ code: 1, msg: 'in use' });

    await expect(deleteTokenById(apiDelete as any, 7, 'Delete failed')).rejects.toThrow('in use');
  });
});
