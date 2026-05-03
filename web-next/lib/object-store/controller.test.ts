import { describe, expect, it, vi } from 'vitest';
import { loadObjectStoreConfig, saveObjectStoreConfig } from './controller';

describe('object store controller', () => {
  it('loads object store config from the existing endpoint', async () => {
    const apiGet = vi.fn().mockResolvedValue({ type: 'OBS', config: { bucketName: 'hb' } });

    const result = await loadObjectStoreConfig(apiGet as any);

    expect(apiGet).toHaveBeenCalledWith('/config/oss');
    expect(result).toEqual({ config: { type: 'OBS', config: { bucketName: 'hb' } } });
  });

  it('saves object store config through the existing endpoint', async () => {
    const apiPost = vi.fn().mockResolvedValue('ok');
    const payload = { type: 'OBS', config: { bucketName: 'hb' } };

    await saveObjectStoreConfig(apiPost as any, payload as any);

    expect(apiPost).toHaveBeenCalledWith('/config/oss', payload);
  });
});
