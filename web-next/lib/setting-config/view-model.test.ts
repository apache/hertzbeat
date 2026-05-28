import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  buildConfigFacts,
  buildTimezoneOptionLabel,
  canSaveSystemConfig,
  normalizeSystemConfigLocale,
  normalizeSystemConfigTheme,
  resolveConfigSaveFeedback,
  resolveSystemConfigDraft,
  resolveSystemLocaleLabel,
  resolveSystemThemeLabel,
  updateSystemConfigField,
  updateSystemConfigTimezone
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

  it('resolves save feedback presentation', () => {
    expect(resolveConfigSaveFeedback('Saved', 'success')).toEqual({
      message: 'Saved',
      className: 'text-emerald-300'
    });
    expect(resolveConfigSaveFeedback('Failed', 'error')).toEqual({
      message: 'Failed',
      className: 'text-rose-300'
    });
    expect(resolveConfigSaveFeedback(null, null)).toBeNull();
  });

  it('normalizes locale and theme values into the supported option set', () => {
    expect(normalizeSystemConfigLocale('zh-CN')).toBe('zh_CN');
    expect(normalizeSystemConfigLocale('ja-JP')).toBe('ja_JP');
    expect(normalizeSystemConfigTheme('dark')).toBe('dark-ops');
    expect(normalizeSystemConfigTheme('default')).toBe('light-ops');
    expect(normalizeSystemConfigTheme('compact')).toBe('compact');
  });

  it('resolves translated locale and theme labels for supported values', () => {
    expect(resolveSystemLocaleLabel('pt-BR', t)).toBe('Portuguese(pt_BR)');
    expect(resolveSystemThemeLabel('default', t)).toBe('Default theme');
  });
});
