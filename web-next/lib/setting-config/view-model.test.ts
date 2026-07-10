import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  SYSTEM_CONFIG_THEME_OPTIONS,
  buildConfigFacts,
  buildTimezoneOptionLabel,
  canSaveSystemConfig,
  isSystemConfigDirty,
  normalizeSystemConfigLocale,
  normalizeSystemConfigTheme,
  readAndClearSystemConfigApplyFeedback,
  resolveConfigSaveFeedback,
  resolveSystemConfigDraft,
  resolveSystemLocaleLabel,
  resolveSystemThemeLabel,
  serializeSystemConfig,
  updateSystemConfigField,
  updateSystemConfigTimezone,
  writeSystemConfigApplyFeedback
} from './view-model';

const t = createTranslatorMock();

describe('setting config view model', () => {
  it('builds facts from system config', () => {
    expect(
      buildConfigFacts(
        { locale: 'zh-CN', theme: 'dark', timeZoneId: 'Asia/Shanghai' } as any,
        t
      )
    ).toEqual([
      { label: 'Workspace', value: 'setting/settings/config' },
      { label: 'System language', value: 'Simplified Chinese(zh_CN)' },
      { label: 'System theme', value: 'Dark theme' },
      { label: 'System timezone', value: 'Asia/Shanghai' }
    ]);
  });

  it('renders missing system config facts with the localized empty fallback', () => {
    expect(
      buildConfigFacts(
        { locale: ' ', theme: 'dark', timeZoneId: '' } as any,
        t
      )
    ).toEqual([
      { label: 'Workspace', value: 'setting/settings/config' },
      { label: 'System language', value: 'None' },
      { label: 'System theme', value: 'Dark theme' },
      { label: 'System timezone', value: 'None' }
    ]);

    expect(resolveSystemLocaleLabel('custom-locale', t)).toBe('custom-locale');
  });

  it('updates config fields immutably', () => {
    expect(updateSystemConfigField({ locale: 'zh-CN' } as any, 'theme', 'dark')).toEqual({
      locale: 'zh-CN',
      theme: 'dark'
    });
  });

  it('updates timezone through the dedicated helper', () => {
    expect(updateSystemConfigTimezone({ locale: 'zh-CN' } as any, 'Asia/Shanghai')).toEqual({
      locale: 'zh-CN',
      timeZoneId: 'Asia/Shanghai'
    });
  });

  it('resolves the current form draft with server config fallback', () => {
    expect(resolveSystemConfigDraft(null, { locale: 'zh-CN', theme: 'dark' } as any)).toEqual({
      locale: 'zh_CN',
      theme: 'dark-ops'
    });
    expect(resolveSystemConfigDraft({ theme: 'compact' } as any, { locale: 'zh-CN' } as any)).toEqual({
      theme: 'compact',
      locale: ''
    });
  });

  it('builds timezone option labels', () => {
    expect(buildTimezoneOptionLabel({ zoneId: 'Asia/Shanghai', offset: '+08:00', displayName: 'Shanghai' } as any)).toBe(
      'Asia/Shanghai (+08:00) Shanghai'
    );
  });

  it('requires locale, theme, and timezone before save is enabled', () => {
    expect(canSaveSystemConfig({ locale: 'zh-CN', theme: 'dark', timeZoneId: 'Asia/Shanghai' } as any)).toBe(true);
    expect(canSaveSystemConfig({ locale: 'zh-CN', theme: 'dark', timeZoneId: '' } as any)).toBe(false);
    expect(canSaveSystemConfig({ locale: '', theme: 'dark', timeZoneId: 'Asia/Shanghai' } as any)).toBe(false);
  });

  it('serializes system config for no-change save detection', () => {
    expect(
      serializeSystemConfig({
        locale: 'zh-CN',
        theme: 'dark',
        timeZoneId: ' Asia/Shanghai '
      } as any)
    ).toBe(
      serializeSystemConfig({
        locale: 'zh_CN',
        theme: 'dark-ops',
        timeZoneId: 'Asia/Shanghai',
        ignored: 'server-only'
      } as any)
    );
    expect(isSystemConfigDirty({ locale: 'zh_CN', theme: 'dark-ops', timeZoneId: 'UTC' } as any, {
      locale: 'zh_CN',
      theme: 'dark-ops',
      timeZoneId: 'Asia/Shanghai'
    } as any)).toBe(true);
  });

  it('resolves save feedback presentation', () => {
    expect(resolveConfigSaveFeedback('Saved', 'success')).toEqual({
      message: 'Saved',
      className: 'text-emerald-300'
    });
    expect(resolveConfigSaveFeedback('Failed', 'error')).toEqual({
      message: 'Failed',
      className: 'text-rose-300'
    });
    expect(resolveConfigSaveFeedback('No changes', 'info')).toEqual({
      message: 'No changes',
      className: 'text-[#9fb0cc]'
    });
    expect(resolveConfigSaveFeedback(null, null)).toBeNull();
  });

  it('normalizes locale and theme values into the supported option set', () => {
    expect(normalizeSystemConfigLocale('zh-CN')).toBe('zh_CN');
    expect(normalizeSystemConfigLocale('ja-JP')).toBe('ja_JP');
    expect(normalizeSystemConfigTheme('dark')).toBe('dark-ops');
    expect(normalizeSystemConfigTheme('default')).toBe('dark-ops');
    expect(normalizeSystemConfigTheme('compact')).toBe('compact');
  });

  it('resolves translated locale and theme labels for supported values', () => {
    expect(resolveSystemLocaleLabel('pt-BR', t)).toBe('Portuguese(pt_BR)');
    expect(resolveSystemThemeLabel('default', t)).toBe('Dark theme');
  });

  it('keeps dark operations as the first theme option and names light mode explicitly', () => {
    expect(SYSTEM_CONFIG_THEME_OPTIONS.map(option => option.value)).toEqual(['dark-ops', 'light-ops', 'compact']);
    expect(SYSTEM_CONFIG_THEME_OPTIONS.map(option => option.labelKey)).toEqual([
      'settings.system-config.theme.dark',
      'settings.system-config.theme.light',
      'settings.system-config.theme.compact'
    ]);
    expect(resolveSystemThemeLabel('light-ops', t)).toBe('Light theme');
  });

  it('persists one-shot apply feedback across system config reloads', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      })
    };

    writeSystemConfigApplyFeedback('Applied successfully', 'success', storage as any);

    expect(readAndClearSystemConfigApplyFeedback(storage as any)).toEqual({
      message: 'Applied successfully',
      tone: 'success'
    });
    expect(readAndClearSystemConfigApplyFeedback(storage as any)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalled();
  });

  it('ignores malformed persisted system config feedback', () => {
    const store = new Map<string, string>([['hertzbeat.setting-config.apply-feedback', '{bad-json']]);
    const storage = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      })
    };

    expect(readAndClearSystemConfigApplyFeedback(storage as any)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith('hertzbeat.setting-config.apply-feedback');
  });
});
