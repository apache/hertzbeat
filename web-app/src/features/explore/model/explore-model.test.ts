/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import {
  buildCrossSignalPath,
  buildExplorePath,
  exploreHandoffState,
  exploreQueryContext,
  exploreUsesExactWindow,
  mergeExploreContextChanges,
  mergeExploreQuery,
  parseExploreQuery,
  presetTimeRangePatch,
  querySubmissionTimePatch,
  retireInstrumentationHandoff,
  signalSelectionPatch,
  timeRangeMilliseconds
} from './explore-model';

describe('explore query state', () => {
  it('keeps only supported values and trims empty context', () => {
    const query = parseExploreQuery(
      new URLSearchParams('signal=logs&timeRange=last-1h&serviceName=%20checkout%20&query=timeout&errorOnly=true')
    );
    expect(query).toMatchObject({
      signal: 'logs',
      timeRange: 'last-1h',
      serviceName: 'checkout',
      query: 'timeout'
    });
    expect(query).not.toHaveProperty('errorOnly');
  });

  it('applies the submission field contract to URL-owned filters', () => {
    const metrics = parseExploreQuery(new URLSearchParams('signal=metrics&aggregation=p95&step=1.5'));
    const outOfRangeStep = parseExploreQuery(new URLSearchParams('signal=metrics&aggregation=AVG&step=86401'));
    const traces = parseExploreQuery(new URLSearchParams('signal=traces&minDurationMs=1.5&maxDurationMs=200'));
    const reversedDurations = parseExploreQuery(
      new URLSearchParams('signal=traces&minDurationMs=300&maxDurationMs=200')
    );

    expect(metrics).toMatchObject({ signal: 'metrics', aggregation: undefined, step: undefined });
    expect(outOfRangeStep).toMatchObject({ signal: 'metrics', aggregation: 'avg', step: undefined });
    expect(traces).toMatchObject({ signal: 'traces', minDurationMs: undefined, maxDurationMs: 200 });
    expect(reversedDurations).toMatchObject({
      signal: 'traces',
      minDurationMs: undefined,
      maxDurationMs: undefined
    });
  });

  it('builds a reproducible path and drops an incomplete exact window', () => {
    expect(
      buildExplorePath({
        signal: 'traces',
        timeRange: 'last-30m',
        serviceName: 'checkout',
        environment: 'prod',
        query: 'POST /checkout',
        errorOnly: true,
        end: 2000
      })
    ).toBe(
      '/explore?signal=traces&timeRange=last-30m&query=POST+%2Fcheckout&errorOnly=true' +
        '&serviceName=checkout&environment=prod'
    );
  });

  it('roundtrips operationName only for metrics', () => {
    const metrics = parseExploreQuery(
      new URLSearchParams('signal=metrics&timeRange=last-30m&operationName=POST%20%2Fcheckout')
    );
    expect(metrics).toMatchObject({ signal: 'metrics', operationName: 'POST /checkout' });
    expect(buildExplorePath(metrics)).toContain('operationName=POST+%2Fcheckout');

    expect(parseExploreQuery(new URLSearchParams('signal=logs&operationName=ignored'))).not.toHaveProperty(
      'operationName'
    );
    expect(parseExploreQuery(new URLSearchParams('signal=traces&operationName=ignored'))).not.toHaveProperty(
      'operationName'
    );
  });

  it('parses canonical and legacy live log URLs but only serializes the canonical mode', () => {
    expect(parseExploreQuery(new URLSearchParams('signal=logs&mode=live'))).toMatchObject({
      signal: 'logs',
      live: true
    });
    expect(parseExploreQuery(new URLSearchParams('signal=logs&live=true'))).toMatchObject({
      signal: 'logs',
      live: true
    });
    expect(parseExploreQuery(new URLSearchParams('signal=logs&mode=history&live=true'))).toMatchObject({
      signal: 'logs',
      live: undefined
    });
    expect(parseExploreQuery(new URLSearchParams('signal=logs&mode=live&live=false'))).toMatchObject({
      signal: 'logs',
      live: true
    });

    const canonical = buildExplorePath({
      signal: 'logs',
      timeRange: 'last-30m',
      live: true
    });
    expect(canonical).toBe('/explore?signal=logs&timeRange=last-30m&mode=live');
    expect(canonical).not.toContain('live=true');
  });

  it('normalizes supported context aliases and drops invalid or unknown URL values', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=invalid&range=last-1h&namespace=commerce&serviceInstanceId=checkout-7d9' +
          '&http.route=%2Fcheckout&autoRefresh=30000&start=-1&end=unsafe&unknown=private'
      )
    );

    expect(query).toMatchObject({
      signal: 'traces',
      timeRange: 'last-1h',
      serviceNamespace: 'commerce',
      instance: 'checkout-7d9',
      endpoint: '/checkout',
      autoRefreshMs: 30_000,
      start: undefined,
      end: undefined
    });
    expect(buildExplorePath(query)).toBe(
      '/explore?signal=traces&timeRange=last-1h&autoRefresh=30000&serviceNamespace=commerce' +
        '&instance=checkout-7d9&endpoint=%2Fcheckout'
    );
  });

  it('drops live mode when moving away from logs', () => {
    const metrics = mergeExploreQuery(
      parseExploreQuery(new URLSearchParams('signal=logs&mode=live')),
      signalSelectionPatch('metrics')
    );

    expect(metrics).not.toHaveProperty('live');
    expect(buildExplorePath(metrics)).not.toMatch(/mode=live|live=true/u);
  });

  it('preserves trace context when moving from logs to traces', () => {
    expect(
      buildCrossSignalPath(
        {
          signal: 'logs',
          timeRange: 'last-30m',
          serviceName: 'checkout',
          query: 'Failed to export'
        },
        'traces',
        { traceId: 'trace-1' }
      )
    ).toBe('/explore?signal=traces&timeRange=last-30m&traceId=trace-1&serviceName=checkout');
  });

  it('keeps only shared context and an explicit trace handoff across signals', () => {
    const source = parseExploreQuery(
      new URLSearchParams(
        'signal=traces&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
          '&instance=checkout-1&endpoint=%2Fcheckout&query=POST%20%2Fcheckout&traceId=trace-1' +
          '&spanId=span-1&resourceFilter=cloud.region%3Dus-east&attributeFilter=http.route%3D%2Fcheckout' +
          '&minDurationMs=100&maxDurationMs=200&errorOnly=true&page=2'
      )
    );

    expect(buildCrossSignalPath(source, 'logs', { traceId: 'trace-1' })).toBe(
      '/explore?signal=logs&timeRange=last-30m&traceId=trace-1&serviceName=checkout' +
        '&serviceNamespace=commerce&environment=prod&instance=checkout-1&endpoint=%2Fcheckout'
    );
    expect(buildCrossSignalPath(source, 'metrics', {})).toBe(
      '/explore?signal=metrics&timeRange=last-30m&serviceName=checkout&serviceNamespace=commerce' +
        '&environment=prod&instance=checkout-1&endpoint=%2Fcheckout'
    );
  });

  it('keeps ordinary direct Explore filters outside onboarding handoff validation', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&mode=live&serviceName=checkout-api&serviceNamespace=commerce&environment=prod' +
          '&instance=checkout-7d9&endpoint=%2Fcheckout'
      )
    );

    expect(query).toMatchObject({
      signal: 'logs',
      live: true,
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      instance: 'checkout-7d9',
      endpoint: '/checkout',
      intakeProfileId: undefined,
      collectorId: undefined,
      windowMode: undefined
    });
    expect(exploreHandoffState(query)).toBe('none');
    for (const scope of [
      { serviceName: 'checkout-api' },
      { serviceNamespace: 'commerce' },
      { environment: 'prod' },
      { instance: 'checkout-7d9' },
      { endpoint: '/checkout' }
    ]) {
      expect(exploreHandoffState({ signal: 'logs', timeRange: 'last-30m', ...scope })).toBe('none');
    }
  });

  it('parses and serializes the complete onboarding handoff without accepting a Token', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=metrics&serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east' +
          '&instance=checkout-7d9&endpoint=%2Fcheckout&start=1710000000000&end=1710000005000' +
          '&token=must-not-enter-explore'
      )
    );

    expect(query).toMatchObject({
      signal: 'metrics',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      collectorId: 'collector-east',
      instance: 'checkout-7d9',
      endpoint: '/checkout',
      start: 1_710_000_000_000,
      end: 1_710_000_005_000
    });
    expect(exploreHandoffState(query)).toBe('scoped');
    expect(exploreUsesExactWindow(query)).toBe(true);
    expect(buildExplorePath(query)).toBe(
      '/explore?signal=metrics&timeRange=last-30m&start=1710000000000&end=1710000005000' +
        '&collectorId=collector-east&serviceName=checkout-api&serviceNamespace=commerce' +
        '&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout'
    );
    expect(buildExplorePath(query)).not.toContain('token');
  });

  it('accepts a complete direct-server handoff without requiring a Collector identity', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=metrics&intakeProfileId=primary-ingress&serviceName=checkout-api' +
          '&serviceNamespace=commerce&environment=prod&start=1710000000000&end=1710000005000' +
          '&token=must-not-enter-explore'
      )
    );

    expect(query).toMatchObject({
      signal: 'metrics',
      intakeProfileId: 'primary-ingress',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      collectorId: undefined,
      start: 1_710_000_000_000,
      end: 1_710_000_005_000
    });
    expect(exploreHandoffState(query)).toBe('scoped');
    expect(exploreUsesExactWindow(query)).toBe(true);
    expect(buildExplorePath(query)).toBe(
      '/explore?signal=metrics&timeRange=last-30m&start=1710000000000&end=1710000005000' +
        '&intakeProfileId=primary-ingress&serviceName=checkout-api&serviceNamespace=commerce&environment=prod'
    );
    expect(buildExplorePath(query)).not.toContain('token');
    expect(
      exploreHandoffState(
        parseExploreQuery(
          new URLSearchParams(
            'intakeProfileId=primary-ingress&serviceName=checkout-api&serviceNamespace=commerce&start=1000&end=2000'
          )
        )
      )
    ).toBe('invalid');
    expect(
      exploreHandoffState(
        parseExploreQuery(
          new URLSearchParams(
            'intakeProfileId=primary-ingress&serviceName=checkout-api&serviceNamespace=commerce' +
              '&environment=prod&start=2000&end=1000'
          )
        )
      )
    ).toBe('invalid');
    expect(
      exploreHandoffState(
        parseExploreQuery(
          new URLSearchParams(
            'intakeProfileId=primary-ingress&serviceName=checkout-api&serviceNamespace=commerce' +
              '&environment=prod&windowMode=preset&end=2000'
          )
        )
      )
    ).toBe('invalid');
  });

  it('switches an exact handoff to a preset without dropping identity context and keeps normal submit refresh behavior', () => {
    const exact = parseExploreQuery(
      new URLSearchParams(
        'signal=metrics&serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east' +
          '&start=1710000000000&end=1710000005000'
      )
    );
    const preset = mergeExploreQuery(exact, presetTimeRangePatch(exact, 'last-1h'));

    expect(exploreHandoffState(preset)).toBe('scoped');
    expect(exploreUsesExactWindow(preset)).toBe(false);
    expect(buildExplorePath(preset)).toBe(
      '/explore?signal=metrics&timeRange=last-1h&windowMode=preset&collectorId=collector-east' +
        '&serviceName=checkout-api&serviceNamespace=commerce&environment=prod'
    );
    expect(exploreHandoffState(parseExploreQuery(new URLSearchParams(buildExplorePath(preset).split('?')[1])))).toBe(
      'scoped'
    );
    expect(querySubmissionTimePatch(exact)).toEqual({});
    expect(presetTimeRangePatch(exact, 'last-1h')).toEqual({
      timeRange: 'last-1h',
      windowMode: 'preset',
      start: undefined,
      end: undefined
    });
    expect(querySubmissionTimePatch({ signal: 'logs', timeRange: 'last-30m' })).toEqual({
      start: undefined,
      end: undefined
    });
    const invalid = parseExploreQuery(
      new URLSearchParams('serviceName=checkout-api&collectorId=collector-east&start=2000&end=1000')
    );
    expect(querySubmissionTimePatch(invalid)).toEqual({
      start: undefined,
      end: undefined
    });
  });

  it('retires only instrumentation markers while preserving an exact ordinary query and its filters', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&intakeProfileId=primary-ingress&collectorId=collector-east&windowMode=preset' +
          '&serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-1' +
          '&endpoint=%2Fcheckout&query=timeout&severityText=ERROR&attributeFilter=http.status_code%3D500'
      )
    );
    const exact = mergeExploreQuery(query, { windowMode: undefined, start: 1_000, end: 2_000 });

    expect(retireInstrumentationHandoff(exact)).toEqual({
      ...exact,
      intakeProfileId: undefined,
      collectorId: undefined,
      windowMode: undefined
    });
  });

  it('retires a preset handoff as a relative query without manufacturing an exact window', () => {
    const preset = parseExploreQuery(
      new URLSearchParams(
        'signal=metrics&intakeProfileId=primary-ingress&serviceName=checkout&serviceNamespace=commerce' +
          '&environment=prod&windowMode=preset&query=rate%28up%5B5m%5D%29'
      )
    );

    expect(retireInstrumentationHandoff(preset)).toMatchObject({
      signal: 'metrics',
      timeRange: 'last-30m',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      query: 'rate(up[5m])',
      intakeProfileId: undefined,
      collectorId: undefined,
      windowMode: undefined,
      start: undefined,
      end: undefined
    });
  });

  it('retires after hierarchical service and environment cleanup without clearing unrelated query fields', () => {
    const current = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&collectorId=collector-east&serviceName=checkout&serviceNamespace=commerce' +
          '&environment=prod&instance=checkout-1&endpoint=%2Fcheckout&query=timeout&severityText=ERROR' +
          '&start=1000&end=2000'
      )
    );
    const serviceChanged = retireInstrumentationHandoff(
      mergeExploreQuery(current, mergeExploreContextChanges(exploreQueryContext(current), { serviceName: 'payments' }))
    );
    const environmentChanged = retireInstrumentationHandoff(
      mergeExploreQuery(current, mergeExploreContextChanges(exploreQueryContext(current), { environment: 'staging' }))
    );

    expect(serviceChanged).toMatchObject({
      serviceName: 'payments',
      serviceNamespace: undefined,
      environment: undefined,
      instance: undefined,
      endpoint: undefined,
      collectorId: undefined,
      query: 'timeout',
      severityText: 'ERROR',
      start: 1_000,
      end: 2_000
    });
    expect(environmentChanged).toMatchObject({
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'staging',
      instance: undefined,
      endpoint: undefined,
      collectorId: undefined,
      query: 'timeout',
      severityText: 'ERROR'
    });
  });

  it('leaves an ordinary Explore query unchanged', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=traces&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
          '&instance=checkout-1&endpoint=%2Fcheckout&query=slow&errorOnly=true&start=1000&end=2000'
      )
    );

    expect(retireInstrumentationHandoff(query)).toEqual(query);
  });

  it('preserves the complete scoped window across signals and marks partial or reversed handoffs invalid', () => {
    const scoped = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east' +
          '&start=1710000000000&end=1710000005000'
      )
    );
    expect(buildCrossSignalPath(scoped, 'traces', {})).toBe(
      '/explore?signal=traces&timeRange=last-30m&start=1710000000000&end=1710000005000' +
        '&collectorId=collector-east&serviceName=checkout-api&serviceNamespace=commerce&environment=prod'
    );

    expect(
      exploreHandoffState(
        parseExploreQuery(
          new URLSearchParams(
            'serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east&start=2000&end=1000'
          )
        )
      )
    ).toBe('invalid');
    expect(
      exploreHandoffState(
        parseExploreQuery(
          new URLSearchParams('serviceName=checkout-api&collectorId=collector-east&start=1000&end=2000')
        )
      )
    ).toBe('invalid');
    expect(
      exploreHandoffState(
        parseExploreQuery(
          new URLSearchParams(
            'serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east' +
              '&windowMode=preset&start=1000'
          )
        )
      )
    ).toBe('invalid');
    expect(
      exploreHandoffState(
        parseExploreQuery(
          new URLSearchParams(
            'serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east' +
              '&windowMode=preset&end=2000'
          )
        )
      )
    ).toBe('invalid');
  });

  it('drops fields that do not belong to the selected signal', () => {
    const metrics = mergeExploreQuery(
      { signal: 'logs', timeRange: 'last-30m', traceId: 'trace-1', severityText: 'ERROR', live: true },
      { signal: 'metrics' }
    );
    expect(metrics).toEqual({
      signal: 'metrics',
      timeRange: 'last-30m',
      serviceName: undefined,
      serviceNamespace: undefined,
      environment: undefined,
      collectorId: undefined,
      query: undefined,
      windowMode: undefined,
      start: undefined,
      end: undefined,
      metricFilter: undefined,
      groupBy: undefined,
      aggregation: undefined,
      step: undefined
    });
  });

  it('clears stale trace conditions and pagination when upstream query context changes', () => {
    const current = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&serviceName=checkout&serviceNamespace=commerce&environment=prod&collectorId=collector-east' +
          '&instance=checkout-7d9&endpoint=%2Fcheckout&query=timeout&traceId=trace-old&spanId=span-old' +
          '&resourceFilter=cloud.region%3Dus-east&attributeFilter=http.status_code%3D500&page=3' +
          '&start=1710000000000&end=1710000005000'
      )
    );
    const next = mergeExploreQuery(
      current,
      mergeExploreContextChanges(exploreQueryContext(current), { serviceName: 'payments' })
    );

    expect(next).toMatchObject({
      signal: 'logs',
      serviceName: 'payments',
      collectorId: 'collector-east',
      query: 'timeout',
      resourceFilter: 'cloud.region=us-east',
      attributeFilter: 'http.status_code=500',
      serviceNamespace: undefined,
      environment: undefined,
      instance: undefined,
      endpoint: undefined,
      traceId: undefined,
      spanId: undefined,
      pageIndex: undefined,
      start: 1_710_000_000_000,
      end: 1_710_000_005_000
    });
  });

  it('clears trace and span identity when the owning time window changes', () => {
    const current = parseExploreQuery(
      new URLSearchParams('signal=traces&timeRange=last-30m&traceId=trace-old&spanId=span-old&page=3')
    );

    expect(mergeExploreQuery(current, { timeRange: 'last-1h' })).toMatchObject({
      timeRange: 'last-1h',
      traceId: undefined,
      spanId: undefined,
      pageIndex: undefined
    });
  });

  it('clears a metric operation dependency when upstream context changes', () => {
    const current = parseExploreQuery(
      new URLSearchParams(
        'signal=metrics&serviceName=checkout&environment=prod&instance=checkout-7d9' +
          '&endpoint=%2Fcheckout&operationName=POST%20%2Fcheckout'
      )
    );
    const next = mergeExploreQuery(
      current,
      mergeExploreContextChanges(exploreQueryContext(current), { serviceName: 'payments' })
    );

    expect(next).toMatchObject({
      signal: 'metrics',
      serviceName: 'payments',
      environment: undefined,
      instance: undefined,
      endpoint: undefined,
      operationName: undefined
    });
  });

  it('keeps explicitly replaced trace conditions during the same context change', () => {
    const current = parseExploreQuery(
      new URLSearchParams('signal=logs&serviceName=checkout&traceId=trace-old&spanId=span-old&page=3')
    );
    const next = mergeExploreQuery(
      current,
      mergeExploreContextChanges(exploreQueryContext(current), {
        serviceName: 'payments',
        traceId: 'trace-new',
        spanId: 'span-new',
        pageIndex: 1
      })
    );

    expect(next).toMatchObject({
      signal: 'logs',
      serviceName: 'payments',
      traceId: 'trace-new',
      spanId: 'span-new',
      pageIndex: 1
    });
  });

  it('uses bounded time presets', () => {
    expect(timeRangeMilliseconds('last-24h')).toBe(86_400_000);
  });
});
