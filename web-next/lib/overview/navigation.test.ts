import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildOverviewCompatRouteUrl, buildOverviewSignalDeskHref } from './navigation';

const topAlert = {
  labels: {
    traceId: 'trace-123',
    spanId: 'span-456',
    service: 'checkout',
    namespace: 'payments',
    cluster: 'prod'
  }
} as const;

describe('overview navigation', () => {
  it('builds overview compatibility redirects with normalized machine query context', () => {
    const target = buildOverviewCompatRouteUrl({
      source: 'root',
      serviceName: 'checkout',
      returnTo: '/entities?returnLabel=Catalog',
      returnLabel: 'Overview',
      start: '1700000000000',
      environment: ['prod', 'ignored']
    });
    const url = new URL(target, 'http://127.0.0.1');

    expect(url.pathname).toBe('/overview');
    expect(url.searchParams.get('source')).toBe('root');
    expect(url.searchParams.get('serviceName')).toBe('checkout');
    expect(url.searchParams.get('environment')).toBe('prod');
    expect(url.searchParams.get('returnTo')).toBe('/entities');
    expect(url.searchParams.get('returnLabel')).toBeNull();
    expect(url.searchParams.get('start')).toBe('1700000000000');
  });

  it('keeps overview and monitor-editor navigation machine-only without display-label fields', () => {
    const overviewNavigationSource = readFileSync(resolve(process.cwd(), 'lib/overview/navigation.ts'), 'utf8');
    const overviewPageSource = readFileSync(resolve(process.cwd(), 'app/overview/overview-page.tsx'), 'utf8');
    const monitorEditorTestSource = readFileSync(resolve(process.cwd(), 'lib/monitor-editor/navigation.test.ts'), 'utf8');

    expect(overviewNavigationSource).not.toContain('returnLabel: string');
    expect(overviewNavigationSource).not.toContain('void returnLabel');
    expect(overviewNavigationSource).not.toContain("url.searchParams.delete('returnLabel')");
    expect(overviewPageSource).not.toContain('overviewReturnLabel');
    expect(monitorEditorTestSource).not.toContain("returnLabel: 'Checkout Service'");
  });

  it('decorates signal desk routes with the active alert context and overview return posture', () => {
    const traceHref = buildOverviewSignalDeskHref('/trace/manage', topAlert as never);
    const traceUrl = new URL(traceHref, 'http://127.0.0.1');

    expect(traceUrl.pathname).toBe('/trace/manage');
    expect(traceUrl.searchParams.get('traceId')).toBe('trace-123');
    expect(traceUrl.searchParams.get('spanId')).toBe('span-456');
    expect(traceUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(traceUrl.searchParams.get('serviceNamespace')).toBe('payments');
    expect(traceUrl.searchParams.get('environment')).toBe('prod');
    expect(traceUrl.searchParams.get('returnTo')).toBe('/overview');
    expect(traceUrl.searchParams.get('returnLabel')).toBeNull();
  });

  it('preserves existing desk query params while adding missing overview context', () => {
    const otlpHref = buildOverviewSignalDeskHref('/ingestion/otlp?signal=logs&returnLabel=Legacy', topAlert as never);
    const otlpUrl = new URL(otlpHref, 'http://127.0.0.1');

    expect(otlpUrl.pathname).toBe('/ingestion/otlp');
    expect(otlpUrl.searchParams.get('signal')).toBe('logs');
    expect(otlpUrl.searchParams.get('traceId')).toBe('trace-123');
    expect(otlpUrl.searchParams.get('spanId')).toBe('span-456');
    expect(otlpUrl.searchParams.get('serviceName')).toBe('checkout');
    expect(otlpUrl.searchParams.get('serviceNamespace')).toBe('payments');
    expect(otlpUrl.searchParams.get('environment')).toBe('prod');
    expect(otlpUrl.searchParams.get('returnTo')).toBe('/overview');
    expect(otlpUrl.searchParams.get('returnLabel')).toBeNull();
  });

  it('leaves non-signal routes untouched', () => {
    expect(buildOverviewSignalDeskHref('/entities', topAlert as never)).toBe('/entities');
  });
});
