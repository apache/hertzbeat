import { describe, expect, it } from 'vitest';

import { buildEntityWorkbenchHref, buildEntityWorkbenchNavigation } from './entity-workbench-navigation';

const context = {
  entityId: '501',
  entityType: 'service',
  entityName: 'checkout',
  monitorId: '909',
  timeRange: 'last-1h',
  source: 'topology:otlp-trace-call',
  filters: 'status:error',
  traceId: 'trace-42',
  returnTo: '/topology?entityId=501&returnLabel=Topology'
};

describe('entity workbench navigation', () => {
  it('builds compatible signal handoff links without changing current routes', () => {
    const links = buildEntityWorkbenchNavigation(context);

    expect(links.overviewHref).toContain('/entities/501?');
    expect(links.metricsHref).toContain('/ingestion/otlp/metrics?');
    expect(links.logsHref).toContain('/log/manage?');
    expect(links.tracesHref).toContain('/trace/manage?');
    expect(links.topologyHref).toContain('/topology?');
    expect(links.alertsHref).toContain('/alert?');
  });

  it('preserves entity, time, source, trace, and sanitized return context', () => {
    const href = buildEntityWorkbenchHref('topology', context);
    const url = new URL(href, 'https://hertzbeat.local');

    expect(url.searchParams.get('entityId')).toBe('501');
    expect(url.searchParams.get('entityType')).toBe('service');
    expect(url.searchParams.get('monitorId')).toBe('909');
    expect(url.searchParams.get('timeRange')).toBe('last-1h');
    expect(url.searchParams.get('source')).toBe('topology:otlp-trace-call');
    expect(url.searchParams.get('filters')).toBe('status:error');
    expect(url.searchParams.get('traceId')).toBe('trace-42');
    expect(url.searchParams.get('returnTo')).toBe('/topology?entityId=501');
  });
});
