import { describe, expect, it } from 'vitest';
import {
  buildSystemConfigSmokeCandidate,
  chooseAlternateValue,
  findSystemConfigMismatches,
  normalizeSystemConfigSmokeLocale,
  normalizeSystemConfigSmokeTheme,
  runSystemConfigSmoke,
  summarizeSystemConfig
} from './system-config-smoke-lib.mjs';

describe('system-config smoke helpers', () => {
  it('normalizes locale and theme aliases into the smoke-safe config set', () => {
    expect(normalizeSystemConfigSmokeLocale('zh-CN')).toBe('zh_CN');
    expect(normalizeSystemConfigSmokeLocale('ja-JP')).toBe('ja_JP');
    expect(normalizeSystemConfigSmokeTheme('default')).toBe('light-ops');
    expect(normalizeSystemConfigSmokeTheme('unknown')).toBe('dark-ops');
  });

  it('chooses an alternate preferred value that differs from the current one', () => {
    expect(chooseAlternateValue(['en_US', 'zh_CN', 'ja_JP'], 'zh_CN', ['ja_JP'])).toBe('ja_JP');
    expect(chooseAlternateValue(['light-ops', 'dark-ops'], 'light-ops', ['light-ops', 'dark-ops'])).toBe('dark-ops');
  });

  it('builds a complete alternate config using the current values and live timezone list', () => {
    expect(
      buildSystemConfigSmokeCandidate(
        {
          locale: 'zh-CN',
          theme: 'dark-ops',
          timeZoneId: 'Asia/Shanghai'
        },
        [
          { zoneId: 'Asia/Shanghai', offset: '+08:00', displayName: 'Shanghai' },
          { zoneId: 'UTC', offset: '+00:00', displayName: 'UTC' }
        ]
      )
    ).toEqual({
      locale: 'ja_JP',
      theme: 'compact',
      timeZoneId: 'UTC'
    });
  });

  it('summarizes configs and reports mismatched persisted values', () => {
    expect(
      summarizeSystemConfig({
        locale: 'en-US',
        theme: 'default',
        timeZoneId: 'UTC'
      })
    ).toEqual({
      locale: 'en_US',
      theme: 'light-ops',
      timeZoneId: 'UTC'
    });

    expect(
      findSystemConfigMismatches(
        { locale: 'en-US', theme: 'default', timeZoneId: 'UTC' },
        { locale: 'en_US', theme: 'compact', timeZoneId: 'UTC' }
      )
    ).toEqual(['theme']);
  });

  it('returns a restored report after the original config is written back', async () => {
    const originalConfig = {
      locale: 'zh-CN',
      theme: 'default',
      timeZoneId: 'Asia/Shanghai'
    };
    const timezones = [
      { zoneId: 'Asia/Shanghai', offset: '+08:00', displayName: 'Shanghai' },
      { zoneId: 'UTC', offset: '+00:00', displayName: 'UTC' }
    ];
    const calls: Array<{ path: string; method: string; body?: Record<string, unknown> | null }> = [];
    let currentConfig = { ...originalConfig };

    const requestMessage = async (
      _baseUrl: string,
      path: string,
      {
        method = 'GET',
        body = null
      }: {
        method?: string;
        token?: string | null;
        body?: Record<string, unknown> | null;
      } = {}
    ) => {
      calls.push({ path, method, body });

      if (path === '/api/config/system' && method === 'GET') {
        return { code: 0, data: { ...currentConfig } };
      }
      if (path === '/api/config/timezones' && method === 'GET') {
        return { code: 0, data: timezones };
      }
      if (path === '/api/config/system' && method === 'POST' && body) {
        currentConfig = {
          locale: String(body.locale),
          theme: String(body.theme),
          timeZoneId: String(body.timeZoneId)
        };
        return { code: 0, data: { ...currentConfig } };
      }

      throw new Error(`Unexpected ${method} ${path}`);
    };

    const result = await runSystemConfigSmoke({
      baseUrl: 'http://127.0.0.1:4200',
      assertRouteLoads: async () => ({
        status: 200,
        finalUrl: 'http://127.0.0.1:4200/setting/settings/config'
      }),
      loginWithPassword: async () => ({
        token: 'token',
        refreshToken: 'refresh'
      }),
      requestMessage,
      requireMessageData: message => message.data,
      assertLocaleBundleLoads: async () => {}
    });

    expect(result.restored).toBe(true);
    expect(result.originalConfig).toEqual({
      locale: 'zh_CN',
      theme: 'light-ops',
      timeZoneId: 'Asia/Shanghai'
    });
    expect(result.smokeConfig).toEqual({
      locale: 'ja_JP',
      theme: 'compact',
      timeZoneId: 'UTC'
    });
    expect(currentConfig).toEqual(originalConfig);
    expect(calls.filter(call => call.path === '/api/config/system' && call.method === 'POST')).toHaveLength(2);
  });
});
