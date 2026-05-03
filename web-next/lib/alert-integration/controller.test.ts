import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fallbackDocCopy, loadIntegrationDoc } from './controller';

describe('alert integration controller', () => {
  it('returns the first available localized guide', async () => {
    const readFile = vi.fn()
      .mockRejectedValueOnce(new Error('missing zh'))
      .mockResolvedValueOnce('# english guide');

    const doc = await loadIntegrationDoc('/docs', 'webhook', readFile as any);

    expect(readFile).toHaveBeenNthCalledWith(1, expect.stringContaining('webhook.zh-CN.md'), 'utf8');
    expect(readFile).toHaveBeenNthCalledWith(2, expect.stringContaining('webhook.en-US.md'), 'utf8');
    expect(doc).toBe('# english guide');
  });

  it('falls back when no guide exists', async () => {
    const readFile = vi.fn().mockRejectedValue(new Error('missing'));
    const doc = await loadIntegrationDoc('/docs', 'webhook', readFile as any);
    expect(doc).toBe('当前告警源暂未提供集成指南。');
    expect(fallbackDocCopy).toBe('当前告警源暂未提供集成指南。');

    const source = readFileSync(resolve(process.cwd(), 'lib/alert-integration/controller.ts'), 'utf8');
    expect(source).not.toContain('No integration guide is available for this provider yet.');
  });
});
