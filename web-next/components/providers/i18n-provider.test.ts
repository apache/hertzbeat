import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildInitialMessages,
  filterRemoteOverlayMessages,
  loadLocaleMessages,
  resolveMessageTemplate,
  shouldUseRemoteLocaleBootstrap
} from './i18n-provider';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function supplementalMessages(locale: 'en-US' | 'zh-CN', keys: string[]) {
  return Object.fromEntries(keys.map(key => [key, SUPPLEMENTAL_MESSAGES[locale]?.[key]]));
}

describe('i18n provider remote overlay messages', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('skips remote bootstrap on standalone routes that must not trigger auth prompts', () => {
    expect(shouldUseRemoteLocaleBootstrap('/passport/login')).toBe(false);
    expect(shouldUseRemoteLocaleBootstrap('/passport/lock')).toBe(false);
    expect(shouldUseRemoteLocaleBootstrap('/status')).toBe(false);
    expect(shouldUseRemoteLocaleBootstrap('/status/public')).toBe(false);
  });

  it('keeps remote bootstrap enabled on authenticated workbench routes', () => {
    expect(shouldUseRemoteLocaleBootstrap('/overview')).toBe(true);
    expect(shouldUseRemoteLocaleBootstrap('/monitors/42')).toBe(true);
    expect(shouldUseRemoteLocaleBootstrap('/trace/manage')).toBe(true);
  });

  it('accepts only temporary monitor.app.* remote overlay keys', () => {
    expect(
      filterRemoteOverlayMessages({
        'monitor.app.mysql': 'MySQL',
        'monitor.app.redis': 'Redis',
        'menu.home': 'Dashboard',
        'monitoring.app.mysql': 'nope'
      })
    ).toEqual({
      'monitor.app.mysql': 'MySQL',
      'monitor.app.redis': 'Redis'
    });
  });

  it('resolves aliased otlp keys from the canonical ingestion bundle shape', () => {
    expect(
      resolveMessageTemplate(
        {
          'ingestion.otlp.metrics.title': 'Metrics Workbench'
        },
        'otlp.metrics.title'
      )
    ).toBe('Metrics Workbench');
  });

  it('seeds critical standalone-route copy synchronously for the first paint', () => {
    expect(buildInitialMessages('en-US')).toEqual(
      expect.objectContaining({
        'app.login.login': 'Login',
        'app.login.tab-login-credentials': 'Sign In HertzBeat',
        'app.passport.desc': 'Open-source private-deployable enterprise operations observability platform'
      })
    );
  });

  it('seeds alert notice modal labels synchronously so cold dialogs never flash raw keys', () => {
    const keys = [
      'alert.notice.template',
      'alert.notice.template.name',
      'alert.notice.template.preset',
      'alert.notice.template.preset.false',
      'alert.notice.template.preset.true',
      'alert.notice.receiver.people',
      'alert.notice.receiver.people.name',
      'alert.notice.receiver.people.placeholder',
      'alert.notice.rule.name',
      'alert.notice.rule.all',
      'alert.notice.rule.tag',
      'alert.notice.rule.period',
      'alert.notice.rule.time',
      'common.enable'
    ];

    expect(buildInitialMessages('zh-CN')).toEqual(
      expect.objectContaining(supplementalMessages('zh-CN', keys))
    );

    expect(buildInitialMessages('en-US')).toEqual(
      expect.objectContaining(supplementalMessages('en-US', keys))
    );
  });

  it('seeds alert notice shell actions synchronously so the workbench does not paint blank controls', () => {
    const keys = [
      'menu.alert.dispatch',
      'alert.notice.receiver',
      'alert.notice.receiver.new',
      'alert.notice.receiver.edit',
      'alert.notice.receiver.delete',
      'alert.notice.receiver.setting',
      'alert.notice.send-test',
      'alert.notice.send-test.notify.success',
      'alert.notice.send-test.notify.failed',
      'common.search',
      'common.edit',
      'common.total',
      'common.button.delete',
      'common.button.ok',
      'common.button.cancel',
      'common.confirm.delete',
      'common.delete-success',
      'common.delete-failed',
      'monitor.status'
    ];

    expect(buildInitialMessages('zh-CN')).toEqual(
      expect.objectContaining(supplementalMessages('zh-CN', keys))
    );

    expect(buildInitialMessages('en-US')).toEqual(
      expect.objectContaining(supplementalMessages('en-US', keys))
    );
  });

  it('does not request or merge remote overlays for standalone routes', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ 'monitor.app.mysql': 'Mysql' }));

    await expect(loadLocaleMessages('en-US', false)).resolves.toEqual(
      expect.objectContaining({
        'monitor.app.mysql': 'Mysql',
        'monitor.detail.history-series.search.count': 'samples'
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/hb-i18n/en-US', { cache: 'no-store' });
  });

  it('keeps supplemental monitor translations after the local bundle replaces the optimistic first paint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ 'menu.home': 'Dashboard' }));

    await expect(loadLocaleMessages('zh-CN', false)).resolves.toEqual(
      expect.objectContaining({
        'menu.home': 'Dashboard',
        ...supplementalMessages('zh-CN', [
          'monitor.detail.history-series.search.count',
          'monitor.detail.history-metric.search.count'
        ])
      })
    );
  });

  it('merges a bounded remote overlay for workbench routes when no base-key collision exists', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ 'menu.home': 'Dashboard' }))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: {
            'monitor.app.redis': 'Managed Redis',
            'menu.home': 'Remote Home'
          }
        })
      );

    await expect(loadLocaleMessages('en-US', true)).resolves.toEqual(
      expect.objectContaining({
        'menu.home': 'Dashboard',
        'monitor.app.redis': 'Managed Redis',
        'monitor.detail.history-series.search.count': 'samples'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/i18n/en-US', { cache: 'no-store' });
  });

  it('drops the remote overlay when it collides with the base bundle', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ 'monitor.app.mysql': 'Mysql' }))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: {
            'monitor.app.mysql': 'Managed MySQL',
            'monitor.app.redis': 'Managed Redis'
          }
        })
      );

    const messages = await loadLocaleMessages('en-US', true);
    expect(messages).toEqual(
      expect.objectContaining({
        'monitor.app.mysql': 'Mysql',
        'monitor.detail.history-series.search.count': 'samples'
      })
    );
    expect(messages).not.toHaveProperty('monitor.app.redis');
    expect(consoleWarn).toHaveBeenCalledWith('Remote i18n overlay collision detected; ignoring overlay payload.');
    consoleWarn.mockRestore();
  });
});
