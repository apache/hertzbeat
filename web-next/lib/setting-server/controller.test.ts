import { describe, expect, it, vi } from 'vitest';
import { loadMessageServerData, saveEmailConfig, saveSmsConfig } from './controller';

describe('setting server controller', () => {
  it('loads email and sms config together', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ emailHost: 'smtp.example.com' })
      .mockResolvedValueOnce({ type: 'aliyun', enable: true });

    const result = await loadMessageServerData(apiGet as any);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/config/email');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/config/sms');
    expect(result).toEqual({
      email: { emailHost: 'smtp.example.com' },
      sms: { type: 'aliyun', enable: true }
    });
  });

  it('saves email config through the existing endpoint', async () => {
    const apiPost = vi.fn().mockResolvedValue('ok');
    await saveEmailConfig(apiPost as any, { emailHost: 'smtp.example.com' });
    expect(apiPost).toHaveBeenCalledWith('/config/email', { emailHost: 'smtp.example.com' });
  });

  it('saves sms config through the existing endpoint', async () => {
    const apiPost = vi.fn().mockResolvedValue('ok');
    await saveSmsConfig(apiPost as any, { type: 'aliyun', enable: true });
    expect(apiPost).toHaveBeenCalledWith('/config/sms', { type: 'aliyun', enable: true });
  });
});
