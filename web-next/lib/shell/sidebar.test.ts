import {
  BellOff,
  Compass,
  FileCode2,
  GitMerge,
  LayoutDashboard,
  Plug,
  RadioReceiver,
  Send,
  Settings2,
  Webhook
} from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { buildShellSidebarSections, resolveShellNavIcon } from './sidebar';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('shell sidebar helpers', () => {
  it('maps configured icons and falls back safely', () => {
    expect(resolveShellNavIcon('overview')).toBe(LayoutDashboard);
    expect(resolveShellNavIcon('settings')).toBe(Settings2);
    expect(resolveShellNavIcon('collector')).toBe(RadioReceiver);
    expect(resolveShellNavIcon('monitor-template')).toBe(FileCode2);
    expect(resolveShellNavIcon('alert-integration')).toBe(Webhook);
    expect(resolveShellNavIcon('alert-group')).toBe(GitMerge);
    expect(resolveShellNavIcon('alert-silence')).toBe(BellOff);
    expect(resolveShellNavIcon('alert-notice')).toBe(Send);
    expect(resolveShellNavIcon('plugins')).toBe(Plug);
    expect(resolveShellNavIcon('missing')).toBe(Compass);
    expect(resolveShellNavIcon()).toBe(Compass);
  });

  it('builds translated sections with active items', () => {
    const sections = buildShellSidebarSections('/alert/setting', t);
    const ingestion = sections.find(section => section.key === 'ingestion');
    const alerting = sections.find(section => section.key === 'alerting');
    const settings = sections.find(section => section.key === 'settings');

    expect(sections.map(section => section.key)).toEqual([
      'ingestion',
      'objects',
      'observability',
      'alerting',
      'dashboards',
      'settings'
    ]);
    expect(ingestion?.title).toBe(t('menu.section.ingestion'));
    expect(ingestion?.items.map(item => item.href)).toEqual([
      '/ingestion/otlp',
      '/monitors',
      '/setting/collector',
      '/setting/define'
    ]);
    expect(ingestion?.items.map(item => item.iconKey)).toEqual([
      'otlp',
      'monitor',
      'collector',
      'monitor-template'
    ]);
    expect(alerting?.title).toBe(t('menu.section.alerting'));
    expect(alerting?.items.some(item => item.href === '/alert' && item.active)).toBe(true);
    expect(alerting?.items.some(item => item.href === '/alert/setting' && item.active)).toBe(true);
    expect(alerting?.items.find(item => item.href === '/alert/setting')?.title).toBe(t('menu.alert.setting'));
    expect(alerting?.items.map(item => item.iconKey)).toEqual([
      'alert',
      'alert-setting',
      'alert-integration',
      'alert-group',
      'alert-inhibit',
      'alert-silence',
      'alert-notice',
      'alert-bulletin'
    ]);
    expect(alerting?.items.some(item => item.href === '/incidents')).toBe(false);
    expect(alerting?.items.some(item => item.href === '/actions')).toBe(false);
    expect(settings?.items.find(item => item.key === 'settings-mcp-server')?.title).toBe(t('menu.advanced.mcp-server'));
    expect(settings?.items.find(item => item.key === 'help-center')?.title).toBe(t('menu.extras.help'));
    expect(settings?.items.some(item => item.href === '/status')).toBe(false);
  });

  it('keeps the novice primary navigation map reachable and highlights nested workflow routes', () => {
    const sections = buildShellSidebarSections('/entities/new', t);
    const items = sections.flatMap(section => section.items.map(item => ({ ...item, section: section.key })));
    const itemByHref = new Map(items.map(item => [item.href, item]));

    [
      '/overview',
      '/ingestion/otlp',
      '/monitors',
      '/entities',
      '/entities/discovery',
      '/entities/import',
      '/log/manage',
      '/trace/manage',
      '/topology',
      '/alert',
      '/alert/setting',
      '/alert/group',
      '/alert/silence',
      '/alert/notice',
      '/setting/settings',
      '/setting/status',
      '/setting/plugins'
    ].forEach(href => {
      const item = itemByHref.get(href);

      expect(item, `missing novice navigation entry for ${href}`).toBeTruthy();
      expect(item?.title).toBeTruthy();
      expect(item?.iconKey).toBeTruthy();
    });

    expect(itemByHref.get('/entities')?.active).toBe(true);
    expect(itemByHref.get('/entities')?.section).toBe('objects');
    expect(itemByHref.get('/entities/discovery')?.section).toBe('objects');
    expect(itemByHref.get('/setting/status')?.section).toBe('settings');

    const alertIntegrationSections = buildShellSidebarSections('/alert/integration/webhook', t);
    const alertItems = alertIntegrationSections.flatMap(section => section.items);
    expect(alertItems.find(item => item.href === '/alert')?.active).toBe(true);
    expect(alertItems.find(item => item.href === '/alert/integration/webhook')?.active).toBe(true);

    const logStreamSections = buildShellSidebarSections('/log/stream', t);
    const logItems = logStreamSections.flatMap(section => section.items);
    expect(logItems.find(item => item.href === '/log/manage')?.active).toBe(true);
  });

  it('does not fall back to catalog English labels for visible sidebar text', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/shell/sidebar.ts'), 'utf8');

    expect(source).toContain('title: t(section.titleKey)');
    expect(source).toContain('title: t(item.labelKey)');
    expect(source).not.toContain(': section.title');
    expect(source).not.toContain(': item.label');
  });
});
