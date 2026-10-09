/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';

import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { buildSignalApiPath } from '@/features/explore/api/explore-api';
import { exploreHandoffState, parseExploreQuery } from '@/features/explore/model/explore-model';
import { buildDashboardPanelExploreLink, resolveDashboardPanelQuery } from './dashboard-panel-query';
import { buildExploreDashboardHandoff } from '@/features/explore/model/explore-dashboard-handoff';

const document = parseHertzBeatDashboardDocument(fixture);
const timeWindow = { from: 1_780_000_000_000, to: 1_780_000_060_000 };
const resolve = (id: string, variableValues = {}) =>
  resolveDashboardPanelQuery({
    panel: document.spec.panels[id]!,
    variables: document.spec.variables,
    variableValues,
    timeWindow
  });

describe('Dashboard panel query resolution', () => {
  it('reopens a calculated panel with the same definition and rejects malformed saved records', () => {
    const logCalculatedV2 = JSON.stringify({
      version: 2,
      nextFieldSeq: 2,
      fields: [{ id: 'c1', kind: 'formula', name: 'upperService', expression: 'upper(@service)' }]
    });
    const handoff = buildExploreDashboardHandoff(
      { signal: 'logs', timeRange: 'last-30m', searchSyntax: 'structured-v2', logCalculatedV2 },
      { timeWindow, timeZone: 'UTC', title: 'Calculated logs', dashboardKey: 'calculated-logs' }
    );
    if (handoff.state !== 'ready') throw new Error('Expected supported handoff');
    const saved = parseHertzBeatDashboardDocument(JSON.parse(JSON.stringify(handoff.handoff.document)));
    const panel = saved.spec.panels.explore!;
    const resolved = resolveDashboardPanelQuery({ panel, variables: [], variableValues: {}, timeWindow });
    expect(resolved).toMatchObject({ state: 'ready', query: { logCalculatedV2 } });
    if (resolved.state !== 'ready') return;
    const link = buildDashboardPanelExploreLink(resolved.query, 'UTC');
    expect(link.state).toBe('ready');
    if (link.state === 'ready') {
      const returned = parseExploreQuery(new URL(link.path, 'https://local.test').searchParams);
      expect(returned.signal === 'logs' && returned.logCalculatedV2).toBe(logCalculatedV2);
    }
    const corrupted = structuredClone(panel);
    const query = corrupted.spec.queries[0].spec.plugin.spec.query;
    if (query.signal !== 'logs') throw new Error('Expected logs panel');
    query.logCalculatedV2 = logCalculatedV2.replace('"version":2', '"version":1');
    expect(resolveDashboardPanelQuery({ panel: corrupted, variables: [], variableValues: {}, timeWindow })).toEqual({
      state: 'invalid'
    });
  });
  it('resolves defaults without mutating the document', () => {
    const original = JSON.stringify(document);
    expect(resolve('jvm')).toMatchObject({
      state: 'ready',
      query: {
        signal: 'metrics',
        timeWindow,
        context: { serviceName: 'alpha-java-m2', serviceNamespace: 'alpha-proof', environment: 'local-proof' }
      }
    });
    expect(JSON.stringify(document)).toBe(original);
  });
  it('applies committed overrides and removes only an empty text dimension', () => {
    const result = resolve('logs', { serviceName: 'checkout', serviceNamespace: '', environment: 'staging' });
    expect(result).toMatchObject({
      state: 'ready',
      query: { context: { serviceName: 'checkout', environment: 'staging' } }
    });
    if (result.state === 'ready') expect(result.query.context).not.toHaveProperty('serviceNamespace');
  });
  it.each([
    { unknown: 'x' },
    { environment: 'production' },
    { serviceName: ' checkout' },
    { serviceName: '${environment}' }
  ])('rejects invalid overrides %j', values => {
    expect(resolve('jvm', values)).toEqual({ state: 'invalid' });
  });
  it('preserves accepted internal variable whitespace without normalization', () => {
    const result = resolve('logs', { serviceName: 'checkout\tworker' });
    expect(result).toMatchObject({ state: 'ready', query: { context: { serviceName: 'checkout\tworker' } } });
  });
  it('rejects unresolved placeholders outside the allowed context fields', () => {
    const panel = structuredClone(document.spec.panels.logs!);
    const query = panel.spec.queries[0].spec.plugin.spec.query;
    if (query.signal !== 'logs') throw new Error('Fixture invalid');
    query.search = '${serviceName}';
    expect(
      resolveDashboardPanelQuery({ panel, variables: document.spec.variables, variableValues: {}, timeWindow })
    ).toEqual({ state: 'invalid' });
  });

  it('keeps Gantt pinned and rejects persisted scope that the detail API cannot execute', () => {
    const result = resolve('trace', { serviceName: 'another-service' });
    expect(result.state).toBe('ready');
    if (result.state === 'ready') expect(result.query.context).toBeUndefined();
    const panel = structuredClone(document.spec.panels.trace!);
    panel.spec.queries[0].spec.plugin.spec.query.context = { serviceName: 'checkout' };
    expect(
      resolveDashboardPanelQuery({ panel, variables: document.spec.variables, variableValues: {}, timeWindow })
    ).toEqual({ state: 'invalid' });
  });
  it.each([
    { from: 0, to: 60_000 },
    { from: 2, to: 1 },
    { from: 1, to: 86_400_002 }
  ])('rejects invalid exact windows %j', window => {
    expect(
      resolveDashboardPanelQuery({
        panel: document.spec.panels.jvm!,
        variables: document.spec.variables,
        variableValues: {},
        timeWindow: window
      })
    ).toEqual({ state: 'invalid' });
  });
});

describe('Dashboard panel Explore handoff', () => {
  it.each(['jvm', 'logs', 'traces', 'trace'])(
    'preserves the %s panel window and scope through the actual Explore parser',
    id => {
      const result = resolve(id);
      expect(result.state).toBe('ready');
      if (result.state !== 'ready') return;
      const link = buildDashboardPanelExploreLink(result.query, 'UTC');
      expect(link.state).toBe('ready');
      if (link.state !== 'ready') return;
      const query = parseExploreQuery(new URL(link.path, 'https://local.test').searchParams);
      expect(exploreHandoffState(query)).not.toBe('invalid');
      expect(query).toMatchObject({ start: timeWindow.from, end: timeWindow.to, timeZone: 'UTC' });
      const api = new URL(buildSignalApiPath(query), 'https://local.test');
      expect(api.searchParams.get('start')).toBe(String(timeWindow.from));
      if (id !== 'trace') expect(api.searchParams.get('serviceName')).toBe('alpha-java-m2');
      else expect(query).toMatchObject({ traceId: '0123456789abcdef0123456789abcdef' });
    }
  );
  it.each([
    {
      signal: 'metrics',
      queryKind: 'time-series',
      metric: {
        name: 'jvm_memory_used_bytes',
        aggregation: 'max',
        temporalAggregation: 'rate',
        stepSeconds: 15,
        operationName: 'checkout'
      },
      expected: {
        query: 'jvm_memory_used_bytes',
        aggregation: 'max',
        temporalAggregation: 'rate',
        step: '15',
        operationName: 'checkout'
      }
    },
    {
      signal: 'logs',
      queryKind: 'table',
      search: 'request failed',
      severity: 'ERROR',
      traceId: 'trace-42',
      spanId: 'span-42',
      hideInternal: true,
      hideNoise: true,
      expected: {
        search: '"request failed"',
        searchSyntax: 'structured-v1',
        severityText: 'ERROR',
        traceId: 'trace-42',
        spanId: 'span-42',
        hideInternal: 'true',
        hideNoise: 'true'
      }
    },
    {
      signal: 'traces',
      queryKind: 'table',
      operationName: 'checkout',
      errorOnly: true,
      minDurationMs: 0,
      maxDurationMs: 4000,
      spanScope: 'entrypoint',
      hideInternal: true,
      expected: {
        operationName: 'checkout',
        errorOnly: 'true',
        minDurationMs: '0',
        maxDurationMs: '4000',
        spanScope: 'entrypoint',
        hideInternal: 'true',
        sort: 'newest'
      }
    }
  ] as const)(
    'preserves every $signal filter and complete collector scope at the transport',
    ({ expected, ...fields }) => {
      const context = {
        serviceName: 'checkout',
        serviceNamespace: 'shop',
        environment: 'staging',
        collectorId: 'hybrid-1',
        instance: 'instance-1',
        endpoint: '/checkout'
      };
      const link = buildDashboardPanelExploreLink({ ...fields, timeWindow, context }, 'America/New_York');
      expect(link.state).toBe('ready');
      if (link.state !== 'ready') return;
      const parsed = parseExploreQuery(new URL(link.path, 'https://local.test').searchParams);
      expect(exploreHandoffState(parsed)).toBe('scoped');
      const params = new URL(buildSignalApiPath(parsed), 'https://local.test').searchParams;
      for (const [name, value] of Object.entries({ ...context, ...expected })) expect(params.get(name)).toBe(value);
      expect(params.get('end')).toBe(String(timeWindow.to));
      expect(parsed.timeZone).toBe('America/New_York');
    }
  );

  it('roundtrips only canonical committed Dashboard return state', () => {
    const result = resolve('logs');
    if (result.state !== 'ready') throw new Error('Fixture invalid');
    const returnTo =
      '/observability/dashboards?' +
      new URLSearchParams({
        dashboard: 'saved-dashboard',
        start: String(timeWindow.from),
        end: String(timeWindow.to),
        timeZone: 'UTC',
        varServiceName: 'checkout',
        varServiceNamespace: ''
      }).toString();
    const link = buildDashboardPanelExploreLink(result.query, 'UTC', returnTo);
    expect(link.state).toBe('ready');
    if (link.state === 'ready')
      expect(parseExploreQuery(new URL(link.path, 'https://local.test').searchParams).dashboardReturnTo).toBe(returnTo);
    for (const invalid of [
      'https://external.test',
      '/observability/dashboards?dashboard=one&dashboard=two',
      returnTo + '&duration=30m'
    ])
      expect(buildDashboardPanelExploreLink(result.query, 'UTC', invalid)).toEqual({
        state: 'unsupported',
        reason: 'return-path'
      });
    expect(buildDashboardPanelExploreLink(result.query, ' UTC').state).toBe('unsupported');
  });

  it('supports exact entity investigation and rejects unrepresentable identity', () => {
    const result = resolve('jvm');
    if (result.state !== 'ready') throw new Error('Fixture invalid');
    const link = buildDashboardPanelExploreLink({ ...result.query, context: { entityId: '42' } }, 'UTC');
    expect(link.state).toBe('ready');
    if (link.state === 'ready') {
      const query = parseExploreQuery(new URL(link.path, 'https://local.test').searchParams);
      expect(exploreHandoffState(query)).toBe('scoped');
      expect(new URL(buildSignalApiPath(query), 'https://local.test').searchParams.get('entityId')).toBe('42');
    }
    expect(buildDashboardPanelExploreLink({ ...result.query, context: { entityType: 'service' } }, 'UTC').state).toBe(
      'unsupported'
    );
    expect(buildDashboardPanelExploreLink({ ...result.query, context: { collectorId: 'hybrid' } }, 'UTC').state).toBe(
      'unsupported'
    );
  });
});

describe('Dashboard evidence boundary handoff', () => {
  it('keeps historical log ordering when returning to Explore', () => {
    const link = buildDashboardPanelExploreLink(
      { signal: 'logs', queryKind: 'table', sort: 'oldest', timeWindow },
      'UTC'
    );
    expect(link.state).toBe('ready');
    if (link.state === 'ready')
      expect(new URL(link.path, 'https://local.test').searchParams.get('sort')).toBe('oldest');
  });
  it('keeps an exclusive trace endpoint when returning to Explore', () => {
    const link = buildDashboardPanelExploreLink(
      { signal: 'traces', queryKind: 'table', endExclusive: true, timeWindow },
      'UTC'
    );
    expect(link.state).toBe('ready');
    if (link.state === 'ready')
      expect(new URL(link.path, 'https://local.test').searchParams.get('endExclusive')).toBe('true');
  });
});

describe('Trace analytics reverse handoff', () => {
  it.each(['spans', 'groups'] as const)('retains %s population, display and exact predicates', queryKind => {
    const query = {
      signal: 'traces' as const,
      queryKind,
      timeWindow,
      endExclusive: true,
      resourceFilter: 'service.version = "1"',
      attributeFilter: 'http.route = "/failure"',
      ...(queryKind === 'groups'
        ? { population: 'matched_spans' as const, groupBy: 'operationName' as const, orderBy: 'count-desc' as const }
        : { sort: 'duration_desc' as const })
    };
    const result = buildDashboardPanelExploreLink(
      query as Parameters<typeof buildDashboardPanelExploreLink>[0],
      'UTC',
      undefined,
      { kind: 'TraceTable', spec: { columns: ['traceName', 'duration'], density: 'comfortable' } }
    );
    expect(result.state).toBe('ready');
    if (result.state !== 'ready') return;
    const params = new URL(result.path, 'https://example.test').searchParams;
    expect(JSON.parse(params.get('traceView')!)).toMatchObject({
      population: 'matched_spans',
      mode: queryKind === 'groups' ? 'groups' : 'list',
      columns: ['traceName', 'duration'],
      density: 'comfortable'
    });
    expect(params.get('resourceFilter')).toBe(query.resourceFilter);
    expect(params.get('attributeFilter')).toBe(query.attributeFilter);
    expect(params.get('endExclusive')).toBe('true');
  });
  it('does not silently discard an imported unsupported group ordering', () => {
    expect(
      buildDashboardPanelExploreLink(
        {
          signal: 'traces',
          queryKind: 'groups',
          timeWindow,
          population: 'matched_traces',
          groupBy: 'serviceName',
          orderBy: 'error-count-desc'
        },
        'UTC'
      )
    ).toEqual({ state: 'unsupported', reason: 'query' });
  });
});
it('restores canonical log category, independent original severity and exact field predicates to Explore', () => {
  const fields = {
    severity: 'SEVERE',
    severityCategory: 'ERROR' as const,
    resourceFilter: ' service.version = "v1,blue" ',
    attributeFilter: 'http.route != "/failure"'
  };
  const link = buildDashboardPanelExploreLink({ signal: 'logs', queryKind: 'table', timeWindow, ...fields }, 'UTC');
  expect(link.state).toBe('ready');
  if (link.state !== 'ready') throw new Error('Expected supported log query');
  const params = new URLSearchParams(link.path.split('?')[1]);
  expect(params.get('resourceFilter')).toBe(fields.resourceFilter);
  expect(parseExploreQuery(params)).toMatchObject({
    signal: 'logs',
    severityText: fields.severity,
    severityCategory: undefined,
    query: 'status:"ERROR"',
    searchSyntax: 'structured-v1',
    resourceFilter: fields.resourceFilter.trim(),
    attributeFilter: fields.attributeFilter
  });
  const request = new URL(buildSignalApiPath(parseExploreQuery(params)), 'http://local').searchParams;
  expect(request.get('search')).toBe('status:"ERROR"');
  expect(request.get('searchSyntax')).toBe('structured-v1');
  expect(request.get('severityText')).toBe(fields.severity);
  expect(request.get('resourceFilter')).toBe(fields.resourceFilter.trim());
  expect(request.get('attributeFilter')).toBe(fields.attributeFilter);
  expect(request.get('start')).toBe(String(timeWindow.from));
  expect(request.get('end')).toBe(String(timeWindow.to));
});

it('preserves structured search syntax when returning a Dashboard panel to Explore', () => {
  const link = buildDashboardPanelExploreLink(
    {
      signal: 'logs',
      queryKind: 'table',
      timeWindow: { from: 1000, to: 2000 },
      search: 'status:error OR status:warn',
      searchSyntax: 'structured-v1'
    },
    'UTC'
  );
  expect(link.state).toBe('ready');
  if (link.state !== 'ready') throw new Error('Expected supported link');
  expect(parseExploreQuery(new URL(link.path, 'http://local').searchParams)).toMatchObject({
    searchSyntax: 'structured-v1',
    query: 'status:error OR status:warn'
  });
});
