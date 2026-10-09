/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { appRouteCatalog } from '@/app/route-registry';
import { buildServicesPath, parseServicesQuery, canonicalServicesReturnPath } from '@/shared/navigation/services-path';
import { buildServiceSignalPath } from './services-navigation';
import { parseExploreQuery, buildExplorePath } from '../../explore/model/explore-url-model';
import { exploreHandoffState } from '../../explore/model/explore-query';
import { buildLogInvestigationPath } from '../../explore/model/explore-investigation-model';
import { createTraceNavigation } from '../../explore/model/explore-trace-navigation';
import { buildSignalApiPath } from '../../explore/api/explore-api';
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';

const source = {
  view: 'performance',
  sort: 'latencyP95Ms',
  order: 'asc',
  entityId: '7',
  serviceName: 'checkout',
  serviceNamespace: 'commerce',
  environment: 'prod',
  search: 'check',
  environmentFilter: 'prod',
  operation: '/checkout',
  errorsOnly: true,
  pageIndex: 2,
  start: 1750000000000,
  end: 1750000060000,
  timeZone: 'UTC',
  instance: 'instance-1'
};
describe('services investigation navigation', () => {
  it('registers the application observability services page', () => {
    expect(appRouteCatalog).toHaveProperty('services', expect.objectContaining({ path: '/observability/services' }));
  });
  it.each(['logs', 'traces'] as const)('keeps a queryable %s handoff and canonical service context', signal => {
    const path = buildServiceSignalPath(source, signal);
    const query = parseExploreQuery(new URL(path, 'https://hertzbeat.local').searchParams);
    expect(exploreHandoffState(query)).toBe('scoped');
    const api = new URL(buildSignalApiPath(query), 'https://hertzbeat.local');
    if (signal === 'traces')
      expect(Object.fromEntries(api.searchParams)).toMatchObject({
        operationName: '/checkout',
        errorOnly: 'true',
        spanScope: 'root'
      });
    else expect(api.searchParams.has('operationName')).toBe(false);
    expect(query).toMatchObject({
      entityId: '7',
      serviceName: 'checkout',
      environment: 'prod',
      instance: 'instance-1',
      start: source.start,
      end: source.end
    });
    expect(canonicalServicesReturnPath(query.servicesReturnTo)).toBe(buildServicesPath(source));
    expect(parseServicesQuery(new URL(query.servicesReturnTo!, 'https://hertzbeat.local').searchParams)).toEqual(
      source
    );
    expect(new URL(buildExplorePath(query), 'https://hertzbeat.local').searchParams.get('servicesReturnTo')).toBe(
      buildServicesPath(source)
    );
  });
  it('keeps details → trace results → service overview as separate return levels', () => {
    const path = buildServiceSignalPath(source, 'traces');
    const query = parseExploreQuery(new URL(path, 'https://hertzbeat.local').searchParams);
    const row = traceEvidenceFixture({ observedStartTime: source.start, observedEndTime: source.end });
    if (query.signal !== 'traces') throw new Error('Expected traces');
    const result = createTraceNavigation([row], query, { from: source.start, to: source.end }, 'UTC', 'Unavailable');
    const detail = parseExploreQuery(new URL(result.links[row.traceId]!, 'https://hertzbeat.local').searchParams);
    expect(detail.returnTo).toMatch(/^\/explore\?/);
    const back = parseExploreQuery(new URL(detail.returnTo!, 'https://hertzbeat.local').searchParams);
    expect(exploreHandoffState(back)).toBe('scoped');
    expect(back.servicesReturnTo).toBe(buildServicesPath(source));
    expect(back).toMatchObject({ query: '/checkout', errorOnly: true, start: source.start, end: source.end });
  });
  it('returns selected logs to their queryable log list before the service overview', () => {
    const query = parseExploreQuery(
      new URL(buildServiceSignalPath(source, 'logs'), 'https://hertzbeat.local').searchParams
    );
    const path = buildLogInvestigationPath(
      query,
      { logRecordUid: 'local-log-1', timeUnixNano: String(BigInt(source.start) * 1000000n) },
      { from: source.start, to: source.end },
      'UTC'
    );
    const focused = parseExploreQuery(new URL(path, 'https://hertzbeat.local').searchParams);
    expect(exploreHandoffState(focused)).toBe('scoped');
    const back = parseExploreQuery(new URL(focused.returnTo!, 'https://hertzbeat.local').searchParams);
    expect(back.signal).toBe('logs');
    expect(exploreHandoffState(back)).toBe('scoped');
    expect(back.servicesReturnTo).toBe(buildServicesPath(source));
  });
  it('allows unresolved scoped telemetry without requiring a catalog entity', () => {
    const query = parseExploreQuery(
      new URL(buildServiceSignalPath({ ...source, entityId: undefined }, 'traces'), 'https://hertzbeat.local')
        .searchParams
    );
    expect(exploreHandoffState(query)).not.toBe('invalid');
    expect(query.entityId).toBeUndefined();
    expect(query.serviceName).toBe('checkout');
  });
  it.each([
    'https://external.test',
    '//external.test',
    '/entities?entityId=7',
    '/observability/services?returnTo=/explore',
    '/observability/services?token=secret',
    '/observability/services?entityId=host'
  ])('rejects unsafe/noncanonical return %s', path => {
    expect(canonicalServicesReturnPath(path)).toBeUndefined();
  });
});
