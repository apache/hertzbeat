import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildAlertCenterRouteUrl,
  buildAlertCompatRouteUrl,
  buildAlertCompatRouteUrlFromSearchParams,
  buildAlertListUrl,
  hasActiveAlertFilters,
  hasAlertEntityContext,
  hasAlertTopologyContext,
  normalizeAlertSearch,
  queryStateFromParams,
  readAlertCenterRouteState
} from './query-state';

describe('alert query state codec', () => {
  it('keeps alert route state machine-only without display-label fields', () => {
    const queryStateSource = readFileSync(resolve(process.cwd(), 'lib/alert-manage/query-state.ts'), 'utf8');
    const alertPageSource = readFileSync(resolve(process.cwd(), 'app/alert/alert-center-page.tsx'), 'utf8');
    const shellSource = readFileSync(resolve(process.cwd(), 'components/shell/app-frame.tsx'), 'utf8');

    expect(queryStateSource).not.toContain('returnLabel: string');
    expect(queryStateSource).not.toContain("returnLabel: ''");
    expect(alertPageSource).not.toContain("returnLabel: ''");
    expect(shellSource).not.toContain("returnLabel: ''");
  });

  it('keeps alert closure surfaces on shared return-context helpers', () => {
    const silenceSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-silence-surface.tsx'), 'utf8');
    const inhibitSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-inhibit-surface.tsx'), 'utf8');

    expect(silenceSource).not.toContain("from '../../lib/signal-route-context'");
    expect(inhibitSource).not.toContain("from '../../lib/signal-route-context'");
    expect(silenceSource).not.toContain('function resolveInternalReturnHref');
    expect(inhibitSource).not.toContain('function resolveInternalReturnHref');
    expect(silenceSource).not.toContain('function hasTopologyReturnContext');
    expect(inhibitSource).not.toContain('function hasTopologyReturnContext');
  });

  it('keeps alert center return href cleanup on the shared alert query-state helper', () => {
    const centerSource = readFileSync(resolve(process.cwd(), 'components/pages/alert-center-surface.tsx'), 'utf8');

    expect(centerSource).not.toContain("from '../../lib/signal-route-context'");
    expect(centerSource).not.toContain('stripReturnLabelFromHref(draft.returnTo)');
    expect(centerSource).toContain('resolveAlertInternalReturnHref');
  });

  it('builds alert list url from active toolbar filters', () => {
    expect(
      buildAlertListUrl({
        search: ' checkout ',
        status: ' firing ',
        severity: ' critical ',
        pageIndex: 2,
        pageSize: 15,
        entityId: '',
        entityName: '',
        returnTo: ''
      })
    ).toBe(
      '/alerts/group?pageIndex=2&pageSize=15&sort=gmtUpdate&order=desc&search=checkout&status=firing&severity=critical'
    );
  });

  it('builds alert list url with service scope context', () => {
    expect(
      buildAlertListUrl({
        search: 'checkout',
        status: 'firing',
        severity: '',
        pageIndex: 0,
        pageSize: 8,
        entityId: '',
        entityName: '',
        returnTo: '',
        serviceName: ' checkout ',
        serviceNamespace: ' payments ',
        environment: ' prod '
      })
    ).toBe(
      '/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&status=firing&serviceName=checkout&serviceNamespace=payments&environment=prod'
    );
  });

  it('builds a clean list url when every filter is empty', () => {
    expect(buildAlertListUrl({ search: '   ', status: '', severity: '', entityId: '', entityName: '', returnTo: '' })).toBe(
      '/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc'
    );
  });

  it('normalizes unsupported alert center pagination back to Angular defaults', () => {
    expect(
      buildAlertListUrl({
        search: '',
        status: '',
        severity: '',
        pageIndex: -1,
        pageSize: 20,
        entityId: '',
        entityName: '',
        returnTo: ''
      })
    ).toBe('/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc');
  });

  it('normalizes search text by trimming whitespace', () => {
    expect(normalizeAlertSearch('  service:checkout  ')).toBe('service:checkout');
  });

  it('reads the shared alert query state from route params', () => {
    const params = new URLSearchParams('search=checkout&status=acknowledged&severity=warning');

    expect(
      queryStateFromParams({
        get: (key: string) => params.get(key)
      })
    ).toEqual({
      search: 'checkout',
      status: 'acknowledged',
      severity: 'warning',
      pageIndex: 0,
      pageSize: 8,
      entityId: '',
      entityName: '',
      returnTo: ''
    });
  });

  it('tracks whether the alert workbench has active filters', () => {
    expect(hasActiveAlertFilters({ search: '', status: '', severity: '', entityId: '', entityName: '', returnTo: '' })).toBe(false);
    expect(hasActiveAlertFilters({ search: '', status: 'resolved', severity: '', entityId: '', entityName: '', returnTo: '' })).toBe(true);
  });

  it('preserves machine entity context while dropping display return labels in entity mode', () => {
    const params = new URLSearchParams(
      'entityId=42&entityName=Checkout%20API&returnTo=%2Fentities%2F42%3FreturnLabel%3DCheckout&returnLabel=Checkout'
    );

    expect(
      queryStateFromParams({
        get: (key: string) => params.get(key)
      })
    ).toEqual({
      search: '',
      status: 'firing',
      severity: '',
      pageIndex: 0,
      pageSize: 8,
      entityId: '42',
      entityName: 'Checkout API',
      returnTo: '/entities/42'
    });
  });

  it('receives topology alert-impact context and turns it into an alert filter', () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    const returnLabel = `HertzBeat ${String.fromCodePoint(0x4f01, 0x4e1a, 0x8fd0, 0x7ef4, 0x62d3, 0x6251)}`;
    const params = new URLSearchParams({
      source: 'topology',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      returnTo: `${returnTo}&returnLabel=HertzBeat%20%E4%BC%81%E4%B8%9A%E8%BF%90%E7%BB%B4%E6%8B%93%E6%89%91`,
      returnLabel
    });

    const query = queryStateFromParams({
      get: (key: string) => params.get(key)
    });

    expect(query).toMatchObject({
      search: 'checkout-api',
      status: 'firing',
      severity: '',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'topology',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      returnTo
    });
    expect(hasAlertTopologyContext(query)).toBe(true);
    expect(buildAlertListUrl(query)).toContain('search=checkout-api');
    expect(new URL(query.returnTo, 'http://localhost').searchParams.get('edgeId')).toBe('svc-checkout--res-orders-db');
  });

  it('preserves incoming three-signal evidence context for alert closure', () => {
    const params = new URLSearchParams({
      signal: 'traces',
      search: 'checkout',
      status: 'firing',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'collector-a',
      template: 'spring-boot',
      returnTo: '/trace/manage?traceId=trace-123&returnLabel=Trace'
    });

    const query = queryStateFromParams({
      get: (key: string) => params.get(key)
    });
    const canonicalUrl = buildAlertCompatRouteUrl({
      get: (key: string) => params.get(key)
    });
    const canonicalParams = new URL(canonicalUrl, 'http://localhost').searchParams;

    expect(query).toMatchObject({
      signal: 'traces',
      search: 'checkout',
      status: 'firing',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'collector-a',
      template: 'spring-boot',
      returnTo: '/trace/manage?traceId=trace-123'
    });
    expect(canonicalParams.get('signal')).toBe('traces');
    expect(canonicalParams.get('traceId')).toBe('trace-123');
    expect(canonicalParams.get('spanId')).toBe('span-456');
    expect(canonicalParams.get('collector')).toBe('collector-a');
    expect(canonicalParams.get('template')).toBe('spring-boot');
  });

  it('preserves unified time and traditional monitor context for alert evidence closure', () => {
    const params = new URLSearchParams({
      signal: 'metrics',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      timeRange: 'last-45m',
      start: '1713200000000',
      end: '1713202700000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'monitor',
      monitorId: '632051474676992',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: 'example.com:443',
      returnTo: '/monitors/632051474676992?returnLabel=Monitor'
    });

    const query = queryStateFromParams({
      get: (key: string) => params.get(key)
    });
    const canonicalUrl = buildAlertCompatRouteUrl({
      get: (key: string) => params.get(key)
    });
    const canonicalParams = new URL(canonicalUrl, 'http://localhost').searchParams;

    expect(query).toMatchObject({
      signal: 'metrics',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      timeRange: 'last-45m',
      start: '1713200000000',
      end: '1713202700000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'monitor',
      monitorId: '632051474676992',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: 'example.com:443',
      returnTo: '/monitors/632051474676992'
    });
    expect(canonicalParams.get('start')).toBe('1713200000000');
    expect(canonicalParams.get('end')).toBe('1713202700000');
    expect(canonicalParams.get('refresh')).toBe('30');
    expect(canonicalParams.get('live')).toBe('false');
    expect(canonicalParams.get('tz')).toBe('Asia/Shanghai');
    expect(canonicalParams.get('monitorId')).toBe('632051474676992');
    expect(canonicalParams.get('monitorName')).toBe('checkout-http');
    expect(canonicalParams.get('monitorApp')).toBe('website');
    expect(canonicalParams.get('monitorInstance')).toBe('example.com:443');
  });

  it('maps compatibility alert aliases into canonical alert workbench urls', () => {
    expect(
      buildAlertCompatRouteUrl({
        get(name: string) {
          if (name === 'content') return ' checkout ';
          if (name === 'status') return ' ACKNOWLEDGED ';
          if (name === 'severity') return ' Warning ';
          if (name === 'entityId') return '42';
          if (name === 'entityName') return 'Checkout API';
          if (name === 'returnTo') return '/entities/42';
          if (name === 'returnLabel') return 'Checkout';
          return null;
        }
      })
    ).toBe('/alert?search=checkout&status=acknowledged&severity=warning&entityId=42&entityName=Checkout+API&returnTo=%2Fentities%2F42');
  });

  it('maps raw Next search params through the alert compatibility owner', () => {
    expect(
      buildAlertCompatRouteUrlFromSearchParams({
        content: ' checkout ',
        status: ' ACKNOWLEDGED ',
        severity: ' Warning ',
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42?returnLabel=Checkout',
        returnLabel: 'Checkout',
        signal: 'logs',
        environment: ['prod', 'ignored']
      })
    ).toBe(
      '/alert?search=checkout&status=acknowledged&severity=warning&entityId=42&entityName=Checkout+API&returnTo=%2Fentities%2F42&environment=prod&signal=logs'
    );
  });

  it('builds alert center route urls from cleared in-memory query state', () => {
    expect(
      buildAlertCenterRouteUrl({
        search: '',
        status: '',
        severity: '',
        pageIndex: 0,
        pageSize: 8,
        entityId: '',
        entityName: '',
        returnTo: '',
        source: 'alert-center-route-1213'
      })
    ).toBe('/alert?pageIndex=0&pageSize=8&source=alert-center-route-1213');

    expect(
      buildAlertCenterRouteUrl({
        search: '',
        status: 'firing',
        severity: '',
        pageIndex: 0,
        pageSize: 15,
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42?returnLabel=Checkout',
        signal: 'logs',
        environment: 'prod'
      })
    ).toBe('/alert?status=firing&pageIndex=0&pageSize=15&entityId=42&entityName=Checkout+API&returnTo=%2Fentities%2F42&environment=prod&signal=logs');
  });

  it('normalizes multi-value URL search params into the first alert center query value', () => {
    const routeState = readAlertCenterRouteState({
      search: [' checkout ', 'ignored'],
      status: [' ACKNOWLEDGED ', 'resolved'],
      severity: [' Warning ', 'critical'],
      entityId: ['42', '84'],
      entityName: ['Checkout API', 'Payments API'],
      returnTo: ['/entities/42?returnLabel=Checkout', '/entities/84'],
      returnLabel: ['Checkout', 'Payments'],
      signal: ['logs', 'metrics'],
      environment: ['prod', 'staging']
    });

    expect(routeState.initialQuery).toMatchObject({
      search: 'checkout',
      status: 'acknowledged',
      severity: 'warning',
      entityId: '42',
      entityName: 'Checkout API',
      returnTo: '/entities/42',
      signal: 'logs',
      environment: 'prod'
    });
    expect(routeState.shouldCleanUrl).toBe(true);
    expect(routeState.cleanUrl).not.toContain('returnLabel');
    const canonicalParams = new URL(routeState.cleanUrl, 'http://localhost').searchParams;
    expect(canonicalParams.get('search')).toBe('checkout');
    expect(canonicalParams.get('status')).toBe('acknowledged');
    expect(canonicalParams.get('severity')).toBe('warning');
    expect(canonicalParams.get('entityId')).toBe('42');
    expect(canonicalParams.get('entityName')).toBe('Checkout API');
    expect(canonicalParams.get('returnTo')).toBe('/entities/42');
    expect(canonicalParams.get('signal')).toBe('logs');
    expect(canonicalParams.get('environment')).toBe('prod');
  });

  it('cleans legacy content and unsupported page-size alert center URLs', () => {
    const routeState = readAlertCenterRouteState({
      content: ' checkout ',
      status: ' FIRING ',
      pageIndex: '0',
      pageSize: '1000',
      source: 'product-design-alert-scale'
    });

    expect(routeState.initialQuery).toMatchObject({
      search: 'checkout',
      status: 'firing',
      pageIndex: 0,
      pageSize: 8,
      source: 'product-design-alert-scale'
    });
    expect(routeState.shouldCleanUrl).toBe(true);
    expect(routeState.cleanUrl).toBe('/alert?search=checkout&status=firing&pageIndex=0&pageSize=8&source=product-design-alert-scale');
    expect(routeState.cleanUrl).not.toContain('content=');
    expect(routeState.cleanUrl).not.toContain('pageSize=1000');
  });

  it('detects when the alert workbench is in entity context', () => {
    expect(hasAlertEntityContext({ search: '', status: '', severity: '', entityId: '', entityName: '', returnTo: '' })).toBe(false);
    expect(hasAlertEntityContext({ search: '', status: '', severity: '', entityId: '42', entityName: '', returnTo: '' })).toBe(true);
  });
});
