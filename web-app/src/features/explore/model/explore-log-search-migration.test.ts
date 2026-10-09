/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { buildSignalApiPath } from '../api/explore-api';
import { buildExplorePath, parseExploreQuery } from './explore-model';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
import { normalizeLogSearch } from './explore-log-search-migration';
import { normalizeExploreQuery } from './explore-url-model';

describe('single log query compatibility', () => {
  it('starts new searches in structured syntax', () => {
    expect(normalizeLogSearch({})).toEqual({ query: undefined, searchSyntax: 'structured-v1' });
  });
  it.each(['service:billing', 'a OR b', '"quoted"', 'C:\\logs\\app', '*literal*'])(
    'preserves legacy literal %s',
    query => {
      expect(normalizeLogSearch({ query })).toEqual({ query: JSON.stringify(query), searchSyntax: 'structured-v1' });
    }
  );
  it.each(['structured-v1', 'unsupported-v2'])('preserves explicit syntax %s', searchSyntax => {
    expect(normalizeLogSearch({ query: 'status:info', searchSyntax })).toEqual({ query: 'status:info', searchSyntax });
  });
  it.each(['line\nbreak', 'x'.repeat(8192)])('does not rewrite unrepresentable legacy input', query => {
    expect(normalizeLogSearch({ query })).toEqual({ query, searchSyntax: undefined });
  });
  it('is idempotent and retains legacy filters and handoff scope', () => {
    const input = {
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      query: 'service:literal',
      serviceName: 'api',
      resourceFilter: 'host.name = "host"',
      traceId: 'trace',
      start: 123,
      end: 456
    };
    const normalized = normalizeExploreQuery(input);
    expect(normalized).toMatchObject({
      ...input,
      query: '"service:literal"',
      resourceFilter: 'host.name = "host"',
      searchSyntax: 'structured-v1'
    });
    expect(normalizeExploreQuery(normalized)).toEqual(normalized);
  });
  it('moves an exact saved-view severity filter into the visible query and keeps locked context', () => {
    const normalized = normalizeExploreQuery({
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      savedView: 'view-1',
      severityCategory: 'INFO',
      serviceName: 'checkout',
      environment: 'prod',
      entityId: 'entity-7',
      traceId: 'trace-1',
      start: 123,
      end: 456
    });
    expect(normalized).toMatchObject({
      query: 'status:"INFO"',
      searchSyntax: 'structured-v1',
      savedView: 'view-1',
      serviceName: 'checkout',
      environment: 'prod',
      entityId: 'entity-7',
      traceId: 'trace-1',
      start: 123,
      end: 456
    });
    expect('severityCategory' in normalized ? normalized.severityCategory : undefined).toBeUndefined();
    expect(normalizeExploreQuery(normalized)).toEqual(normalized);
  });
  it('keeps legacy resource and attribute equality clauses intact when structured matching may differ', () => {
    const normalized = normalizeExploreQuery({
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      resourceFilter: `host.name = 'MiXeD' AND host.kind = "*"`,
      attributeFilter: 'event.name = "a\\"b"',
      start: 123,
      end: 456
    });
    expect(normalized).toMatchObject({
      query: undefined,
      searchSyntax: 'structured-v1',
      resourceFilter: `host.name = 'MiXeD' AND host.kind = "*"`,
      attributeFilter: 'event.name = "a\\"b"',
      start: 123,
      end: 456
    });
    expect(normalizeExploreQuery(normalized)).toEqual(normalized);
  });
});

describe('severity scope survives repeated URL and saved-query normalization', () => {
  const cases = [
    { name: 'empty', input: undefined, expected: 'status:"ERROR"' },
    { name: 'legacy literal', input: 'timeout', expected: '"timeout" AND status:"ERROR"' },
    { name: 'literal boolean words', input: 'a OR b', expected: '"a OR b" AND status:"ERROR"' },
    { name: 'literal wildcard', input: '*literal*', expected: '"*literal*" AND status:"ERROR"' },
    {
      name: 'structured OR',
      input: 'service:checkout OR env:prod',
      syntax: 'structured-v1',
      expected: '(service:checkout OR env:prod) AND status:"ERROR"'
    },
    {
      name: 'existing conflicting status',
      input: 'status:"WARN"',
      syntax: 'structured-v1',
      expected: 'status:"WARN"',
      retained: true
    },
    {
      name: 'status marker in quoted value',
      input: '@message:"status:WARN"',
      syntax: 'structured-v1',
      expected: '@message:"status:WARN"',
      retained: true
    },
    { name: 'literal status marker', input: 'literal status:WARN', expected: '"literal status:WARN"', retained: true },
    {
      name: 'unrepresentable control character',
      input: 'line\nbreak',
      expected: 'line\nbreak',
      retained: true,
      literal: true
    },
    {
      name: 'maximum legacy length',
      input: 'x'.repeat(8192),
      expected: 'x'.repeat(8192),
      retained: true,
      literal: true
    }
  ];
  it.each(cases)('retains exact category, text, scope and time for $name', fixture => {
    let query = normalizeExploreQuery({
      signal: 'logs',
      timeRange: 'last-30m',
      query: fixture.input,
      searchSyntax: fixture.syntax,
      severityCategory: 'ERROR',
      severityText: 'SEVERE',
      serviceName: 'checkout',
      resourceFilter: 'service.version = "v1,blue"',
      attributeFilter: 'http.route != "/failure"',
      start: 1000,
      end: 2000,
      timeZone: 'UTC'
    });
    expect(query).toMatchObject({
      query: fixture.expected,
      searchSyntax: fixture.literal ? undefined : 'structured-v1',
      severityCategory: fixture.retained ? 'ERROR' : undefined,
      severityText: 'SEVERE',
      serviceName: 'checkout',
      start: 1000,
      end: 2000,
      timeZone: 'UTC'
    });
    const request = buildSignalApiPath(query, 10_000_000);
    for (let cycle = 0; cycle < 3; cycle++) {
      query = parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams);
      expect(buildSignalApiPath(query, 10_000_000)).toBe(request);
      const restored = readSavedQuery(
        buildSavedQueryPayload(query, 'severity-fixture', 'Synthetic severity scope', '')
      );
      expect(restored.kind).toBe('ready');
      if (restored.kind !== 'ready') throw new Error('Expected restored severity scope');
      query = restored.query;
      expect(buildSignalApiPath(query, 10_000_000)).toBe(request);
    }
  });
  it.each(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'])(
    'preserves %s as an exact canonical status term',
    category => {
      const query = normalizeExploreQuery({
        signal: 'logs',
        timeRange: 'last-30m',
        severityCategory: category,
        severityText: 'ORIGINAL',
        start: 1000,
        end: 2000,
        timeZone: 'UTC'
      });
      const request = new URL(buildSignalApiPath(query), 'http://local').searchParams;
      expect(request.get('search')).toBe(`status:"${category}"`);
      expect(request.get('searchSyntax')).toBe('structured-v1');
      expect(request.get('severityText')).toBe('ORIGINAL');
      expect(request.get('severityCategory')).toBeNull();
    }
  );
});
