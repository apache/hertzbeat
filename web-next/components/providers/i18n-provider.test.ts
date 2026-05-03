import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildInitialMessages,
  filterRemoteOverlayMessages,
  loadLocaleMessages,
  resolveMessageTemplate,
  shouldUseRemoteLocaleBootstrap
} from './i18n-provider';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
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
    expect(buildInitialMessages('zh-CN')).toEqual(
      expect.objectContaining({
        'alert.notice.template': '通知模板',
        'alert.notice.template.name': '模板名称',
        'alert.notice.template.preset': '模版类型',
        'alert.notice.template.preset.false': '用户自定义模版',
        'alert.notice.template.preset.true': '系统内置模版',
        'alert.notice.receiver.people': '接收对象',
        'alert.notice.receiver.people.name': '接收对象名称',
        'alert.notice.receiver.people.placeholder': '选择接收对象',
        'alert.notice.rule.name': '策略名称',
        'alert.notice.rule.all': '转发所有',
        'alert.notice.rule.tag': '标签匹配',
        'alert.notice.rule.period': '时间周期',
        'alert.notice.rule.time': '通知时段',
        'common.enable': '启用状态'
      })
    );

    expect(buildInitialMessages('en-US')).toEqual(
      expect.objectContaining({
        'alert.notice.template': 'Notice Template',
        'alert.notice.template.name': 'Template Name',
        'alert.notice.template.preset': 'Template Type',
        'alert.notice.template.preset.false': 'User Custom',
        'alert.notice.template.preset.true': 'System Preset',
        'alert.notice.receiver.people': 'Receiver',
        'alert.notice.receiver.people.name': 'Receiver Name',
        'alert.notice.receiver.people.placeholder': 'Select a receiver',
        'alert.notice.rule.name': 'Policy Name',
        'alert.notice.rule.all': 'Dispatch All',
        'alert.notice.rule.tag': 'Label Match',
        'alert.notice.rule.period': 'Time Period',
        'alert.notice.rule.time': 'Notification Time',
        'common.enable': 'Enable'
      })
    );
  });

  it('seeds alert notice shell actions synchronously so the workbench does not paint blank controls', () => {
    expect(buildInitialMessages('zh-CN')).toEqual(
      expect.objectContaining({
        'menu.alert.dispatch': '消息通知',
        'alert.notice.receiver': '通知媒介',
        'alert.notice.receiver.new': '新增接收对象',
        'alert.notice.receiver.edit': '编辑接收对象',
        'alert.notice.receiver.delete': '删除接收对象',
        'alert.notice.receiver.setting': '配置',
        'alert.notice.send-test': '发送告警测试',
        'alert.notice.send-test.notify.success': '触发告警测试成功!',
        'alert.notice.send-test.notify.failed': '触发告警测试失败!',
        'common.search': '搜索',
        'common.edit': '操作',
        'common.total': '总量',
        'common.button.delete': '删除选中项',
        'common.button.ok': '确定',
        'common.button.cancel': '取消',
        'common.confirm.delete': '请确认是否删除!',
        'common.delete-success': '删除成功',
        'common.delete-failed': '删除失败',
        'monitor.status': '任务状态'
      })
    );

    expect(buildInitialMessages('en-US')).toEqual(
      expect.objectContaining({
        'menu.alert.dispatch': 'Notification',
        'alert.notice.receiver': 'Notice Receiver',
        'alert.notice.receiver.new': 'New Receiver',
        'alert.notice.receiver.edit': 'Edit Receiver',
        'alert.notice.receiver.delete': 'Delete Receiver',
        'alert.notice.receiver.setting': 'Setting',
        'alert.notice.send-test': 'Send Alert Test Msg',
        'alert.notice.send-test.notify.success': 'Send Alert Test Success!',
        'alert.notice.send-test.notify.failed': 'Send Alert Test Failed!',
        'common.search': 'Search',
        'common.edit': 'Operate',
        'common.total': 'Total',
        'common.button.delete': 'Delete selected',
        'common.button.ok': 'OK',
        'common.button.cancel': 'Cancel',
        'common.confirm.delete': 'Please confirm whether to delete!',
        'common.delete-success': 'Deleted successfully',
        'common.delete-failed': 'Delete failed',
        'monitor.status': 'Task Status'
      })
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
        'monitor.detail.history-series.search.count': '个采样点',
        'monitor.detail.history-metric.search.count': '个指标'
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
