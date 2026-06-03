import { describe, expect, it } from 'vitest';
import {
  appendSignalRouteContext,
  buildSignalAlertHandlingHref,
  buildSignalEntityContextRows,
  copySignalRouteContextParams,
  readSignalRouteContext
} from './signal-route-context';

describe('signal route context', () => {
  it('reads the shared signal context from search params', () => {
    const params = new URLSearchParams(
      'start=10&end=20&timeRange=last-1h&refresh=30&live=1&tz=Asia%2FShanghai&entityId=7&entityName=checkout&returnTo=%2Fentities%2F7&serviceName=checkout&serviceNamespace=payments&environment=prod&traceId=trace-1&spanId=span-1&source=otlp&collector=collector-a&template=spring-boot&monitorId=42&monitorName=HTTPS%20Probe&monitorApp=website&monitorInstance=example.com%3A443'
    );

    expect(readSignalRouteContext(params)).toEqual({
      start: '10',
      end: '20',
      timeRange: 'last-1h',
      refresh: '30',
      live: 'true',
      tz: 'Asia/Shanghai',
      entityId: '7',
      entityName: 'checkout',
      returnTo: '/entities/7',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      traceId: 'trace-1',
      spanId: 'span-1',
      source: 'otlp',
      collector: 'collector-a',
      template: 'spring-boot',
      monitorId: '42',
      monitorName: 'HTTPS Probe',
      monitorApp: 'website',
      monitorInstance: 'example.com:443'
    });
  });

  it('copies only machine context and strips display return labels', () => {
    const next = new URLSearchParams('traceId=trace-1');
    copySignalRouteContextParams(
      new URLSearchParams(
        'start=10&end=20&timeRange=last-1h&refresh=30&live=false&tz=Asia%2FShanghai&entityId=7&returnTo=%2Fentities%3FreturnLabel%3DEntity&returnLabel=Entity&serviceName=checkout&noise='
      ),
      next
    );

    expect(next.toString()).toBe(
      'traceId=trace-1&start=10&end=20&timeRange=last-1h&refresh=30&live=false&tz=Asia%2FShanghai&entityId=7&returnTo=%2Fentities&serviceName=checkout'
    );
    expect(next.get('returnLabel')).toBeNull();
  });

  it('rejects non-integer epoch millis route context instead of rounding dirty values', () => {
    const next = new URLSearchParams('traceId=trace-1');
    copySignalRouteContextParams(
      new URLSearchParams('start=1777484896189.989&end=1777485856189.989&serviceName=checkout'),
      next
    );

    expect(next.toString()).toBe('traceId=trace-1&serviceName=checkout');
    expect(readSignalRouteContext(new URLSearchParams('start=10.5&end=20.1'))).toEqual({});
  });

  it('rejects decimal numeric entity ids instead of forwarding dirty route primitives', () => {
    const next = new URLSearchParams('traceId=trace-1');
    copySignalRouteContextParams(new URLSearchParams('entityId=7.5&entityName=checkout&serviceName=checkout'), next);

    expect(next.toString()).toBe('traceId=trace-1&entityName=checkout&serviceName=checkout');
    expect(readSignalRouteContext(new URLSearchParams('entityId=7.5&entityName=checkout'))).toEqual({
      entityName: 'checkout'
    });
  });

  it('appends shared signal context from an explicit object', () => {
    const next = new URLSearchParams('traceId=trace-1');
    const logWorkbenchLabel = String.fromCodePoint(0x65e5, 0x5fd7, 0x5de5, 0x4f5c, 0x53f0);
    appendSignalRouteContext(next, {
      start: '10',
      end: '20',
      entityName: 'checkout',
      environment: 'prod',
      monitorId: '42',
      monitorName: 'HTTPS Probe',
      monitorApp: 'website',
      monitorInstance: 'example.com:443',
      returnTo: `/log/manage?returnLabel=${logWorkbenchLabel}`
    });

    expect(next.toString()).toBe(
      'traceId=trace-1&start=10&end=20&entityName=checkout&returnTo=%2Flog%2Fmanage&environment=prod&monitorId=42&monitorName=HTTPS+Probe&monitorApp=website&monitorInstance=example.com%3A443'
    );
    expect(next.get('returnLabel')).toBeNull();
  });

  it('uses the platform time URL contract when appending monitor-linked expression ranges', () => {
    const next = new URLSearchParams('source=monitor');
    appendSignalRouteContext(next, {
      timeRange: 'last-1h',
      from: 'now-6h',
      to: 'now',
      start: '1712730000000',
      end: '1712733600000',
      refresh: '30',
      live: 'true',
      tz: 'Asia/Shanghai',
      monitorId: '42',
      monitorName: 'HTTPS Probe'
    });

    expect(next.toString()).toBe(
      'source=monitor&from=now-6h&to=now&refresh=30&live=true&timezone=Asia%2FShanghai&monitorId=42&monitorName=HTTPS+Probe'
    );
  });

  it('bridges canonical timezone URLs back to the signal context timezone control alias', () => {
    expect(readSignalRouteContext(new URLSearchParams('from=now-6h&to=now&timezone=Asia%2FShanghai&source=monitor'))).toEqual({
      from: 'now-6h',
      to: 'now',
      tz: 'Asia/Shanghai',
      timezone: 'Asia/Shanghai',
      source: 'monitor'
    });
  });

  it('does not read display return labels into signal route context', () => {
    const context = readSignalRouteContext(
      new URLSearchParams(
        'returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-1%26returnLabel%3D%E9%93%BE%E8%B7%AF%E5%B7%A5%E4%BD%9C%E5%8F%B0&returnLabel=%E6%97%A5%E5%BF%97%E5%B7%A5%E4%BD%9C%E5%8F%B0&serviceName=checkout'
      )
    );

    expect(context).toEqual({
      returnTo: '/trace/manage?traceId=trace-1',
      serviceName: 'checkout'
    });
    expect((context as Record<string, string | undefined>).returnLabel).toBeUndefined();
  });

  it('builds alert handling links for firing alert closure instead of threshold-rule configuration', () => {
    const logWorkbenchLabel = String.fromCodePoint(0x65e5, 0x5fd7, 0x5de5, 0x4f5c, 0x53f0);
    const href = buildSignalAlertHandlingHref('logs', {
      entityId: '7',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      returnTo: `/log/manage?returnLabel=${logWorkbenchLabel}`
    });
    const url = new URL(href, 'https://example.com');

    expect(url.pathname).toBe('/alert');
    expect(url.searchParams.get('status')).toBe('firing');
    expect(url.searchParams.get('signal')).toBe('logs');
    expect(url.searchParams.get('search')).toBe('checkout');
    expect(url.searchParams.get('entityId')).toBe('7');
    expect(url.searchParams.get('entityName')).toBe('Checkout API');
    expect(url.searchParams.get('serviceName')).toBe('checkout');
    expect(url.searchParams.get('environment')).toBe('prod');
    expect(url.searchParams.get('timeRange')).toBe('last-1h');
    expect(url.searchParams.get('source')).toBe('otlp');
    expect(url.searchParams.get('returnTo')).toBe('/log/manage');
    expect(url.searchParams.get('returnLabel')).toBeNull();
  });

  it('keeps trace and span context visible inside shared signal entity panels', () => {
    expect(buildSignalEntityContextRows({
      entityId: '7',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      traceId: 'trace-1',
      spanId: 'span-1',
      source: 'otlp'
    })).toContainEqual({
      label: 'Trace context',
      value: 'trace-1',
      meta: 'spanId span-1'
    });
  });

  it('keeps traditional monitor context visible inside shared signal entity panels', () => {
    expect(buildSignalEntityContextRows({
      serviceName: 'checkout',
      timeRange: 'last-1h',
      monitorId: '42',
      monitorName: 'HTTPS Probe',
      monitorApp: 'website',
      monitorInstance: 'example.com:443'
    })).toContainEqual({
      label: 'Monitor instance',
      value: 'HTTPS Probe',
      meta: 'website · example.com:443 · monitorId 42'
    });
  });

  it('labels monitor-origin signal handoff as traditional monitor context instead of OTLP intake', () => {
    const rows = buildSignalEntityContextRows({
      source: 'monitor',
      timeRange: 'last-1h',
      monitorId: '42',
      monitorName: 'HTTPS Probe',
      monitorApp: 'website',
      monitorInstance: 'example.com:443'
    });

    expect(rows).toContainEqual({
      label: 'Monitor instance',
      value: 'HTTPS Probe',
      meta: 'website · example.com:443 · monitorId 42'
    });
    expect(rows).toContainEqual({
      label: 'Source',
      value: 'Traditional monitoring',
      meta: 'Monitor center context'
    });
    expect(rows.map(row => `${row.value} ${row.meta}`).join(' ')).not.toContain('OTLP');
  });

  it('labels alert and topology evidence sources without leaking route tokens', () => {
    const alertRows = buildSignalEntityContextRows({
      source: 'alert',
      timeRange: 'last-1h'
    });
    const topologyRows = buildSignalEntityContextRows({
      source: 'topology:database-middleware-connection',
      timeRange: 'last-1h'
    });

    expect(alertRows).toContainEqual({
      label: 'Source',
      value: 'Alert event',
      meta: 'Alert evidence context'
    });
    expect(topologyRows).toContainEqual({
      label: 'Source',
      value: 'Topology relation',
      meta: 'Database / middleware connection'
    });
    expect([...alertRows, ...topologyRows].map(row => `${row.value} ${row.meta}`).join(' ')).not.toContain('topology:');
    expect([...alertRows, ...topologyRows].map(row => `${row.value} ${row.meta}`).join(' ')).not.toContain('alert ');
  });

  it('summarizes absolute time, refresh, pause, timezone, and monitor origin for visible evidence panels', () => {
    const rows = buildSignalEntityContextRows({
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
      monitorInstance: 'example.com:443'
    });

    expect(rows).toContainEqual({
      label: 'Time range',
      value: 'last-45m',
      meta: '2024/04/16 00:53:20 → 2024/04/16 01:38:20 · Refresh 30s · Paused · Asia/Shanghai'
    });
    expect(rows).toContainEqual({
      label: 'Monitor instance',
      value: 'checkout-http',
      meta: 'website · example.com:443 · monitorId 632051474676992'
    });
    expect(rows).toContainEqual({
      label: 'Source',
      value: 'Traditional monitoring',
      meta: 'Monitor center context'
    });
  });
});
