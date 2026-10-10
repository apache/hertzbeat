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
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis } from '@/platform/perses';

import {
  buildCrossSignalPath,
  buildExploreSignalNavigationPath,
  buildExplorePath,
  exploreHandoffState,
  exploreQueryContext,
  exploreUsesExactWindow,
  logTrendZoomPatch,
  mergeExploreContextChanges,
  mergeExploreQuery,
  parseExploreQuery,
  presetTimeRangePatch,
  exactTimeRangePatch,
  querySubmissionTimePatch,
  retireInstrumentationHandoff,
  signalSelectionPatch,
  timeRangeMilliseconds
} from './explore-model';

describe('explore query state', () => {
  it('defaults a bare Explore route to metrics', () => {
    expect(parseExploreQuery(new URLSearchParams())).toMatchObject({ signal: 'metrics', timeRange: 'last-30m' });
  });

  it('round-trips authoritative investigation identity and timezone without changing the exact epoch window', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&timeRange=last-30m&entityId=7&monitorId=42&serviceName=checkout' +
          '&start=1723454400000&end=1723456200000&timeZone=Asia%2FShanghai'
      )
    );

    expect(query).toMatchObject({
      entityId: '7',
      monitorId: '42',
      serviceName: 'checkout',
      start: 1_723_454_400_000,
      end: 1_723_456_200_000,
      timeZone: 'Asia/Shanghai'
    });
    expect(buildExplorePath(query)).toBe(
      '/explore?signal=logs&timeRange=last-30m&searchSyntax=structured-v1&start=1723454400000&end=1723456200000' +
        '&timeZone=Asia%2FShanghai&entityId=7&monitorId=42&serviceName=checkout'
    );
  });

  it.each(['table', 'toplist'] as const)(
    'falls back from legacy Logs %s URLs while retaining applied scope',
    representation => {
      const analysis = encodeLogAnalysis({
        ...DEFAULT_LOG_ANALYSIS,
        representation,
        field: 'attribute:thread.name'
      });
      const params = new URLSearchParams({
        signal: 'logs',
        query: 'exception',
        serviceName: 'HertzBeat',
        start: '1790388951138',
        end: '1790390751138',
        logAnalysis: analysis,
        logGroupSelection: '{"version":1,"groups":[{"field":"attribute:thread.name","kind":"value","value":"worker"}]}'
      });

      const query = parseExploreQuery(params);

      expect(query).toMatchObject({
        signal: 'logs',
        query: '"exception"',
        serviceName: 'HertzBeat',
        start: 1_790_388_951_138,
        end: 1_790_390_751_138,
        logGroupSelection: '{"version":1,"groups":[{"field":"attribute:thread.name","kind":"value","value":"worker"}]}'
      });
      if (query.signal !== 'logs') throw new Error('Expected Logs query');
      expect(query.logAnalysis).toContain('"representation":"logs"');
      const built = buildExplorePath(query);
      expect(built).toContain('logGroupSelection=');
      const roundTrip = parseExploreQuery(new URLSearchParams(built.split('?')[1]));
      if (roundTrip.signal !== 'logs') throw new Error('Expected Logs query');
      expect(roundTrip.logAnalysis).toContain('"representation":"logs"');
    }
  );

  it('preserves malformed legacy analysis for explicit recovery instead of broadening the query', () => {
    const raw = '{"version":1,"representation":"table"';
    const query = parseExploreQuery(new URLSearchParams(`signal=logs&logAnalysis=${encodeURIComponent(raw)}`));
    expect(query.signal).toBe('logs');
    if (query.signal !== 'logs') throw new Error('Expected Logs query');
    expect(query.logAnalysis).toBe(raw);
  });

  it('accepts an exact entity investigation without inventing monitor or ingestion identity', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=metrics&entityId=677625915133184&start=1750000000000&end=1750000060000' + '&timeZone=Asia%2FShanghai'
      )
    );

    expect(exploreHandoffState(query)).toBe('scoped');
    expect(exploreUsesExactWindow(query)).toBe(true);
    expect(buildExplorePath(query)).toBe(
      '/explore?signal=metrics&timeRange=last-30m&start=1750000000000&end=1750000060000' +
        '&timeZone=Asia%2FShanghai&entityId=677625915133184'
    );
    expect(query.monitorId).toBeUndefined();
    expect(query.serviceName).toBeUndefined();
  });

  it('keeps only supported values and trims empty context', () => {
    const query = parseExploreQuery(
      new URLSearchParams('signal=logs&timeRange=last-1h&serviceName=%20checkout%20&query=timeout&errorOnly=true')
    );
    expect(query).toMatchObject({
      signal: 'logs',
      timeRange: 'last-1h',
      serviceName: 'checkout',
      query: '"timeout"'
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

  it('roundtrips only strict signal-specific parity filters', () => {
    const metrics = parseExploreQuery(
      new URLSearchParams('signal=metrics&temporalAggregation=rate&spanScope=root&hideInternal=true')
    );
    const logs = parseExploreQuery(
      new URLSearchParams('signal=logs&hideInternal=true&hideNoise=true&temporalAggregation=delta')
    );
    const traces = parseExploreQuery(
      new URLSearchParams('signal=traces&spanScope=entrypoint&hideInternal=true&hideNoise=true')
    );

    expect(metrics).toMatchObject({ signal: 'metrics', temporalAggregation: 'rate' });
    expect(buildExplorePath(metrics)).toContain('temporalAggregation=rate');
    expect(metrics).not.toHaveProperty('spanScope');
    expect(metrics).not.toHaveProperty('hideInternal');
    expect(logs).toMatchObject({ signal: 'logs', hideInternal: true, hideNoise: true });
    expect(buildExplorePath(logs)).toContain('hideInternal=true&hideNoise=true');
    expect(logs).not.toHaveProperty('temporalAggregation');
    expect(traces).toMatchObject({ signal: 'traces', spanScope: 'entrypoint', hideInternal: true });
    expect(buildExplorePath(traces)).toContain('spanScope=entrypoint&hideInternal=true');
    expect(traces).not.toHaveProperty('hideNoise');

    for (const invalid of ['sum', 'RATE', 'false', '']) {
      const query = parseExploreQuery(new URLSearchParams(`signal=metrics&temporalAggregation=${invalid}`));
      expect(query).toMatchObject({ temporalAggregation: undefined });
      expect(buildExplorePath(query)).not.toContain('temporalAggregation=');
    }
    for (const invalid of ['server', 'ROOT', 'false', '']) {
      const query = parseExploreQuery(new URLSearchParams(`signal=traces&spanScope=${invalid}`));
      expect(query).toMatchObject({ spanScope: undefined });
      expect(buildExplorePath(query)).not.toContain('spanScope=');
    }
    expect(parseExploreQuery(new URLSearchParams('signal=logs&hideInternal=false&hideNoise=1'))).toMatchObject({
      signal: 'logs',
      hideInternal: undefined,
      hideNoise: undefined
    });
    expect(buildExplorePath(metrics)).not.toMatch(/spanScope|hideInternal|hideNoise/u);
    expect(buildExplorePath(logs)).not.toContain('temporalAggregation');
    expect(
      buildExplorePath(parseExploreQuery(new URLSearchParams('signal=logs&hideInternal=false&hideNoise=false')))
    ).not.toMatch(/hideInternal|hideNoise/u);
    expect(buildCrossSignalPath(metrics, 'logs', {})).not.toContain('temporalAggregation');
    expect(buildCrossSignalPath(logs, 'traces', {})).not.toMatch(/hideInternal|hideNoise/u);
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
    expect(canonical).toBe('/explore?signal=logs&timeRange=last-30m&mode=live&searchSyntax=structured-v1');
    expect(canonical).not.toContain('live=true');
  });

  it('normalizes legacy trace context aliases and drops invalid or unknown URL values', () => {
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

  it('builds sidebar signal links from applied URL scope without resetting the selected signal', () => {
    const current =
      '?signal=logs&timeRange=last-30m&start=1723454400000&end=1723456200000&serviceName=checkout&query=error';
    expect(buildExploreSignalNavigationPath(current, 'logs')).toBe(`/explore${current}`);
    expect(buildExploreSignalNavigationPath(current, 'traces')).toBe(
      '/explore?signal=traces&timeRange=last-30m&start=1723454400000&end=1723456200000&serviceName=checkout'
    );
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

  it('keeps shared context, applicable attribute filters and an explicit trace handoff across signals', () => {
    const source = parseExploreQuery(
      new URLSearchParams(
        'signal=traces&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
          '&instance=checkout-1&endpoint=%2Fcheckout&query=POST%20%2Fcheckout&traceId=trace-1' +
          '&spanId=span-1&resourceFilter=cloud.region%3Dus-east&attributeFilter=http.route%3D%2Fcheckout' +
          '&minDurationMs=100&maxDurationMs=200&errorOnly=true&spanScope=root&hideInternal=true&page=2'
      )
    );

    expect(buildCrossSignalPath(source, 'logs', { traceId: 'trace-1' })).toBe(
      '/explore?signal=logs&timeRange=last-30m&traceId=trace-1&resourceFilter=cloud.region%3Dus-east&attributeFilter=http.route%3D%2Fcheckout&searchSyntax=structured-v1&serviceName=checkout' +
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
      pageIndex: undefined,
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
      query: '"timeout"',
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
      query: '"timeout"',
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
      query: '"timeout"',
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

  it('turns a bounded Log trend zoom into an exact query without dropping active filters', () => {
    const query = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&timeRange=last-30m&windowMode=preset&page=3&logRecordUid=record-1' +
          '&serviceName=checkout&serviceNamespace=commerce&environment=prod&query=timeout&severityText=warn' +
          '&resourceFilter=cloud.region%3Dus-east&attributeFilter=http.status_code%3D500' +
          '&traceId=0123456789abcdef0123456789abcdef&spanId=0123456789abcdef'
      )
    );
    expect(query.signal).toBe('logs');
    if (query.signal !== 'logs') throw new Error('Expected a Log Explore query');
    const patch = logTrendZoomPatch(
      query,
      { from: 1_750_000_000_000, to: 1_750_003_600_000 },
      { from: 1_750_000_600_000, to: 1_750_001_200_000 }
    );

    expect(patch).toEqual({
      start: 1_750_000_600_000,
      end: 1_750_001_200_000,
      windowMode: undefined,
      pageIndex: undefined,
      logRecordUid: undefined,
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef'
    });
    expect(mergeExploreQuery(query, patch!)).toMatchObject({
      signal: 'logs',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      query: '"timeout"',
      severityText: 'warn',
      resourceFilter: 'cloud.region=us-east',
      attributeFilter: 'http.status_code=500',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
      start: 1_750_000_600_000,
      end: 1_750_001_200_000,
      windowMode: undefined,
      pageIndex: undefined,
      logRecordUid: undefined
    });
  });

  it('rejects an unchanged Log trend window', () => {
    const window = { from: 1_750_000_000_000, to: 1_750_003_600_000 };
    expect(logTrendZoomPatch({ signal: 'logs', timeRange: 'last-30m' }, window, window)).toBeUndefined();
  });

  it.each([
    ['unsafe start', { from: Number.MAX_SAFE_INTEGER + 1, to: Number.MAX_SAFE_INTEGER + 2 }],
    ['non-positive start', { from: 0, to: 1_750_000_600_000 }],
    ['reversed window', { from: 1_750_000_600_000, to: 1_750_000_000_000 }],
    ['outside evidence', { from: 1_749_999_999_999, to: 1_750_000_600_000 }],
    ['over 24 hours', { from: 1_750_000_000_000, to: 1_750_086_400_001 }]
  ] as const)('rejects a %s Log trend zoom', (_name, requested) => {
    expect(
      logTrendZoomPatch(
        { signal: 'logs', timeRange: 'last-30m' },
        { from: 1_750_000_000_000, to: 1_750_100_000_000 },
        requested
      )
    ).toBeUndefined();
  });
});

it('resets pagination for preset and valid exact time changes without authoring fields', () => {
  expect(presetTimeRangePatch({ signal: 'logs', timeRange: 'last-30m', pageIndex: 3 }, 'last-1h')).toHaveProperty(
    'pageIndex',
    undefined
  );
  expect(exactTimeRangePatch({ from: 1000, to: 61000 }, 'UTC')).toEqual({
    start: 1000,
    end: 61000,
    timeZone: 'UTC',
    windowMode: undefined,
    autoRefreshMs: undefined,
    pageIndex: undefined
  });
  expect(exactTimeRangePatch({ from: 61000, to: 1000 }, 'UTC')).toBeUndefined();
  expect(exactTimeRangePatch({ from: 1000, to: 86401001 }, 'UTC')).toBeUndefined();
  expect(exactTimeRangePatch({ from: 1000, to: 2000 }, 'invalid-zone')).toBeUndefined();
});
