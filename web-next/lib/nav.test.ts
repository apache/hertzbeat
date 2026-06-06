import { describe, expect, it, vi } from 'vitest';
import { cutoverCandidateRoutes, cutoverHoldRoutes, legacyRouteAliases, navSections, placeholderRoutes, routeMatrixPaths } from './nav';
import { routeLabel } from './route-labels';
import { createTranslatorMock } from '../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('navigation information architecture', () => {
  it('keeps the expected first-level sections', () => {
    expect(navSections.map(section => section.key)).toEqual([
      'ingestion',
      'objects',
      'observability',
      'alerting',
      'dashboards',
      'settings'
    ]);
  });

  it('organizes existing pages around HertzBeat operator workflows', () => {
    expect(navSections.find(section => section.key === 'ingestion')?.items.map(item => item.href)).toEqual([
      '/ingestion/otlp',
      '/monitors',
      '/setting/collector',
      '/setting/define'
    ]);
    expect(navSections.find(section => section.key === 'objects')?.items.map(item => item.href)).toEqual([
      '/entities',
      '/entities/discovery',
      '/entities/import'
    ]);
    expect(navSections.find(section => section.key === 'alerting')?.items.map(item => item.href)).toEqual([
      '/alert',
      '/alert/setting',
      '/alert/integration/webhook',
      '/alert/group',
      '/alert/inhibit',
      '/alert/silence',
      '/alert/notice',
      '/bulletin'
    ]);
  });

  it('contains the expected observability entries', () => {
    expect(navSections.find(section => section.key === 'observability')?.items.map(item => item.href)).toEqual([
      '/ingestion/otlp/metrics',
      '/log/manage',
      '/trace/manage',
      '/topology'
    ]);
  });

  it('keeps the three signal workbench labels on the same i18n pattern', () => {
    const signalItems = navSections.find(section => section.key === 'observability')?.items.filter(item => [
      '/ingestion/otlp/metrics',
      '/log/manage',
      '/trace/manage'
    ].includes(item.href));

    expect(signalItems?.map(item => item.labelKey)).toEqual([
      'menu.ingestion.metrics',
      'menu.log.manage',
      'menu.trace.manage'
    ]);
    const workbenchSuffix = t('menu.log.manage').slice(-2);
    expect(signalItems?.map(item => t(item.labelKey)).every(label => label.endsWith(workbenchSuffix))).toBe(true);
  });

  it('keeps only real existing app entries visible in navigation', () => {
    const visibleHrefs = navSections.flatMap(section => section.items.map(item => item.href));

    expect(visibleHrefs).not.toEqual(expect.arrayContaining(['/dashboard', '/incidents', '/actions', '/explorer']));
    expect(navSections.find(section => section.key === 'dashboards')?.items.map(item => item.href)).toEqual(['/overview']);
    const dashboardSection = navSections.find(section => section.key === 'dashboards');
    expect(dashboardSection?.titleKey).toBe('menu.section.dashboards');
    expect(t(dashboardSection?.titleKey || '')).toBe(t('menu.section.dashboards'));
    expect(dashboardSection?.items[0]?.labelKey).toBe('menu.overview');
    expect(t(dashboardSection?.items[0]?.labelKey || '')).toBe(t('menu.overview'));
    expect(navSections.find(section => section.key === 'settings')?.items.map(item => item.href)).toEqual([
      '/setting/settings',
      '/setting/settings/mcp-server',
      '/setting/status',
      '/setting/labels',
      '/setting/plugins',
      'https://hertzbeat.apache.org/docs/'
    ]);
    expect(navSections.find(section => section.key === 'settings')?.items.map(item => item.href)).not.toContain('/status');
  });

  it('uses HertzBeat workflow section labels instead of old mixed platform buckets', () => {
    expect(navSections.map(section => section.titleKey)).toEqual([
      'menu.section.ingestion',
      'menu.section.objects',
      'menu.section.observability',
      'menu.section.alerting',
      'menu.section.dashboards',
      'menu.section.settings'
    ]);
    expect(navSections.map(section => t(section.titleKey))).toEqual([
      t('menu.section.ingestion'),
      t('menu.section.objects'),
      t('menu.section.observability'),
      t('menu.section.alerting'),
      t('menu.section.dashboards'),
      t('menu.section.settings')
    ]);
  });

  it('tracks the completed M10 cutover groups without stale hold or placeholder routes', () => {
    expect(cutoverCandidateRoutes.some(route => route.href === '/overview')).toBe(true);
    expect(cutoverCandidateRoutes.some(route => route.href === '/dashboard')).toBe(false);
    expect(cutoverCandidateRoutes.some(route => route.href === '/topology')).toBe(true);
    expect(cutoverCandidateRoutes.some(route => route.href === '/log/manage')).toBe(true);
    expect(cutoverCandidateRoutes.some(route => route.href === '/trace/manage')).toBe(true);
    expect(cutoverCandidateRoutes.some(route => route.href === '/monitors/[monitorId]')).toBe(true);
    expect(cutoverCandidateRoutes.some(route => route.href === '/passport/login')).toBe(true);
    expect(cutoverCandidateRoutes.some(route => route.href === '/actions')).toBe(true);
    expect(cutoverCandidateRoutes.some(route => route.href === '/incidents')).toBe(true);
    expect(cutoverCandidateRoutes.some(route => route.href === '/explorer')).toBe(true);
    expect(cutoverHoldRoutes.map(route => route.href)).toEqual([]);
    expect(placeholderRoutes.map(route => route.href)).toEqual([]);
  });

  it('keeps legacy aliases and route-matrix targets in the route contract', () => {
    expect(legacyRouteAliases.map(route => route.href)).toEqual(
      expect.arrayContaining(['/setting', '/setting/settings/mcp-server', '/dashboard', '/alerts', '/events', '/alert/center', '/log/stream', '/log/integration', '/status/public'])
    );
    expect(routeMatrixPaths).toEqual(
      expect.arrayContaining(['/setting', '/alert/center', '/alerts', '/events', '/log/stream', '/incidents', '/actions', '/monitors/1', '/entities/1', '/status/public'])
    );
  });

  it('keeps compatibility alias labels product-native without stale legacy copy', () => {
    expect(legacyRouteAliases.map(route => route.label).filter(label => /\bLegacy\b/i.test(label))).toEqual([]);
    expect(legacyRouteAliases.map(route => route.label).filter(label => /\b(?:SigNoZ|Datadog|Google Cloud)\b/i.test(label))).toEqual([]);
  });
});

describe('routeLabel', () => {
  it('maps key routes to user-facing labels', () => {
    expect(routeLabel('/overview', t)).toBe(t('menu.overview'));
    expect(routeLabel('/trace/manage?traceId=1', t)).toBe(t('menu.trace.manage'));
    expect(routeLabel('/log/manage', t)).toBe(t('menu.log.manage'));
    expect(routeLabel('/monitors', t)).toBe(t('menu.monitor.center'));
    expect(routeLabel('/entities/123', t)).toBe(t('entity.detail'));
    expect(routeLabel('/alert/setting', t)).toBe(t('menu.alert.setting'));
    expect(routeLabel('/setting/status', t)).toBe(t('menu.advanced.status'));
    expect(routeLabel('/dashboard', t)).toBe(t('menu.overview'));
    expect(routeLabel('/alerts', t)).toBe(t('menu.alert.center'));
    expect(routeLabel('/events', t)).toBe(t('menu.log.manage'));
    expect(routeLabel('/status/public', t)).toBe(t('menu.advanced.status'));
  });

  it('falls back to dashboard label for unknown routes', () => {
    expect(routeLabel('/unknown', t)).toBe(t('menu.dashboard'));
  });
});
