import { Compass, LayoutDashboard, Settings2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { buildShellSidebarSections, resolveShellNavIcon } from './sidebar';

const t = vi.fn((key: string) => `translated:${key}`);

describe('shell sidebar helpers', () => {
  it('maps configured icons and falls back safely', () => {
    expect(resolveShellNavIcon('overview')).toBe(LayoutDashboard);
    expect(resolveShellNavIcon('settings')).toBe(Settings2);
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
    expect(ingestion?.title).toBe('translated:menu.section.ingestion');
    expect(ingestion?.items.map(item => item.href)).toEqual([
      '/ingestion/otlp',
      '/monitors',
      '/setting/collector',
      '/setting/define'
    ]);
    expect(alerting?.title).toBe('translated:menu.section.alerting');
    expect(alerting?.items.some(item => item.href === '/alert' && item.active)).toBe(true);
    expect(alerting?.items.some(item => item.href === '/alert/setting' && item.active)).toBe(true);
    expect(alerting?.items.find(item => item.href === '/alert/setting')?.title).toBe('translated:menu.alert.setting');
    expect(alerting?.items.some(item => item.href === '/incidents')).toBe(false);
    expect(alerting?.items.some(item => item.href === '/actions')).toBe(false);
    expect(settings?.items.find(item => item.key === 'settings-mcp-server')?.title).toBe('translated:menu.advanced.mcp-server');
    expect(settings?.items.find(item => item.key === 'help-center')?.title).toBe('translated:menu.extras.help');
    expect(settings?.items.some(item => item.href === '/status')).toBe(false);
  });
});
