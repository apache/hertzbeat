import { describe, expect, it, vi } from 'vitest';
import {
  applySystemConfigRuntime,
  loadSystemConfigData,
  normalizeSystemConfigRuntimeLocale,
  persistSystemConfig,
  saveSystemConfig
} from './controller';

describe('setting config controller', () => {
  it('loads config and timezone options together', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ locale: 'zh-CN', theme: 'dark', timeZoneId: 'Asia/Shanghai' })
      .mockResolvedValueOnce([{ zoneId: 'Asia/Shanghai', offset: '+08:00', displayName: 'Shanghai' }]);

    const result = await loadSystemConfigData(apiGet as any);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/config/system');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/config/timezones');
    expect(result).toEqual({
      config: { locale: 'zh-CN', theme: 'dark', timeZoneId: 'Asia/Shanghai' },
      timezones: [{ zoneId: 'Asia/Shanghai', offset: '+08:00', displayName: 'Shanghai' }]
    });
  });

  it('saves config through the existing endpoint', async () => {
    const apiPost = vi.fn().mockResolvedValue('ok');
    const payload = { locale: 'zh-CN', theme: 'dark', timeZoneId: 'Asia/Shanghai' };
    await saveSystemConfig(apiPost as any, payload as any);
    expect(apiPost).toHaveBeenCalledWith('/config/system', payload);
  });

  it('returns the translated success message after saving', async () => {
    const apiPost = vi.fn().mockResolvedValue('ok');

    await expect(
      persistSystemConfig(apiPost as any, { locale: 'zh-CN' } as any, 'Saved successfully')
    ).resolves.toBe('Saved successfully');
  });

  it('applies locale, theme, and reload side effects after save', async () => {
    const apiPost = vi.fn().mockResolvedValue('ok');
    const setLocale = vi.fn(async () => {});
    const applyTheme = vi.fn();
    const reload = vi.fn();

    await expect(
      persistSystemConfig(
        apiPost as any,
        { locale: 'ja_JP', theme: 'compact', timeZoneId: 'UTC' } as any,
        'Saved successfully',
        { setLocale, applyTheme, reload }
      )
    ).resolves.toBe('Saved successfully');

    expect(setLocale).toHaveBeenCalledWith('ja-JP');
    expect(applyTheme).toHaveBeenCalledWith('compact');
    expect(reload).toHaveBeenCalled();
  });

  it('can apply runtime side effects without re-saving', async () => {
    const setLocale = vi.fn(async () => {});
    const applyTheme = vi.fn();
    const reload = vi.fn();

    await applySystemConfigRuntime({ locale: 'pt_BR', theme: 'light-ops' } as any, { setLocale, applyTheme, reload });

    expect(setLocale).toHaveBeenCalledWith('pt-BR');
    expect(applyTheme).toHaveBeenCalledWith('light-ops');
    expect(reload).toHaveBeenCalled();
  });

  it('normalizes Angular system config locale values before runtime reload', () => {
    expect(normalizeSystemConfigRuntimeLocale('zh_CN')).toBe('zh-CN');
    expect(normalizeSystemConfigRuntimeLocale('en-US')).toBe('en-US');
    expect(normalizeSystemConfigRuntimeLocale(' pt_BR ')).toBe('pt-BR');
    expect(normalizeSystemConfigRuntimeLocale(null)).toBe('');
  });
});
