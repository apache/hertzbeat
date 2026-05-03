import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn();

vi.mock('node:fs', () => ({
  promises: {
    readFile
  }
}));

describe('hb-i18n route', () => {
  beforeEach(() => {
    vi.resetModules();
    readFile.mockReset();
  });

  it('serves the normalized local locale bundle', async () => {
    readFile.mockResolvedValue('{"menu.dashboard":"Dashboard"}');

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/hb-i18n/zh_CN'), {
      params: Promise.resolve({ lang: 'zh_CN' })
    });

    await expect(response.json()).resolves.toMatchObject({
      'menu.dashboard': 'Dashboard',
      'common.save': '保存',
      'alert.notice.title': '通知中心'
    });
    expect(readFile).toHaveBeenCalledWith(
      expect.stringContaining('/web-app/src/assets/i18n/zh-CN.json'),
      'utf-8'
    );
  });

  it('lets web-next supplemental messages override legacy web-app locale keys', async () => {
    readFile.mockResolvedValue(
      JSON.stringify({
        'alert.workbench.empty.copy': '当前时间范围和筛选条件下还没有可处理的告警，点击刷新后重新查询最新结果。',
        'alert.workbench.empty.copy.filtered': '当前筛选条件下没有匹配结果，可以调整筛选条件或重新查询最新结果。'
      })
    );

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/hb-i18n/zh-CN'), {
      params: Promise.resolve({ lang: 'zh-CN' })
    });

    await expect(response.json()).resolves.toMatchObject({
      'alert.workbench.empty.copy': '当前时间范围和筛选条件下还没有可处理的告警。',
      'alert.workbench.empty.copy.filtered': '当前筛选条件下没有匹配结果，可以调整筛选条件后重新查询。'
    });
  });
});
