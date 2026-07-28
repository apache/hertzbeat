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

  it('builds a reproducible path without internal entity context', () => {
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
      '/explore?signal=traces&timeRange=last-30m&serviceName=checkout&environment=prod&query=POST+%2Fcheckout&errorOnly=true&end=2000'
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
    ).toBe('/explore?signal=traces&timeRange=last-30m&serviceName=checkout&traceId=trace-1');
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
      '/explore?signal=metrics&timeRange=last-30m&collectorId=collector-east&serviceName=checkout-api' +
        '&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout' +
        '&start=1710000000000&end=1710000005000'
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
      '/explore?signal=metrics&timeRange=last-30m&intakeProfileId=primary-ingress&serviceName=checkout-api' +
        '&serviceNamespace=commerce&environment=prod&start=1710000000000&end=1710000005000'
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
      '/explore?signal=metrics&timeRange=last-1h&collectorId=collector-east&serviceName=checkout-api' +
        '&serviceNamespace=commerce&environment=prod&windowMode=preset'
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

  it('preserves the complete scoped window across signals and marks partial or reversed handoffs invalid', () => {
    const scoped = parseExploreQuery(
      new URLSearchParams(
        'signal=logs&serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east' +
          '&start=1710000000000&end=1710000005000'
      )
    );
    expect(buildCrossSignalPath(scoped, 'traces', {})).toBe(
      '/explore?signal=traces&timeRange=last-30m&collectorId=collector-east&serviceName=checkout-api' +
        '&serviceNamespace=commerce&environment=prod&start=1710000000000&end=1710000005000'
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
