import { describe, expect, it } from 'vitest';
import {
  buildSettingsCompatRouteUrl,
  resolveSettingsCompatRoute,
  SETTING_CONFIG_ROUTE,
  SETTING_OBJECT_STORE_ROUTE,
  SETTING_SERVER_ROUTE,
  SETTING_TOKEN_ROUTE
} from './navigation';

describe('setting settings layout navigation', () => {
  it('routes novice settings entry hints to the matching settings page while preserving query context', () => {
    expect(resolveSettingsCompatRoute()).toBe(SETTING_CONFIG_ROUTE);
    expect(resolveSettingsCompatRoute({ section: 'server' })).toBe(SETTING_SERVER_ROUTE);
    expect(resolveSettingsCompatRoute({ focus: 'smtp' })).toBe(SETTING_SERVER_ROUTE);
    expect(resolveSettingsCompatRoute({ tab: 'object_store' })).toBe(SETTING_OBJECT_STORE_ROUTE);
    expect(resolveSettingsCompatRoute({ tab: 'token' })).toBe(SETTING_TOKEN_ROUTE);
    expect(resolveSettingsCompatRoute({ tab: ['tokens', 'config'] })).toBe(SETTING_TOKEN_ROUTE);

    expect(buildSettingsCompatRouteUrl({
      tab: 'token',
      mode: 'audit',
      returnTo: '/entities/7'
    })).toBe('/setting/settings/token?tab=token&mode=audit&returnTo=%2Fentities%2F7');
    expect(buildSettingsCompatRouteUrl({
      section: 'server',
      focus: 'sms',
      returnTo: '/alert'
    })).toBe('/setting/settings/server?section=server&focus=sms&returnTo=%2Falert');
    expect(buildSettingsCompatRouteUrl({
      section: 'object-store',
      returnLabel: 'Object storage',
      returnTo: '/setting?returnLabel=Settings'
    })).toBe('/setting/settings/object-store?section=object-store&returnTo=%2Fsetting');
  });
});
