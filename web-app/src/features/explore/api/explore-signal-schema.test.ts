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

import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { parseLogPage } from './explore-log-schema';
import { parseMetricConsole } from './explore-metric-schema';
import { parseTracePage } from './explore-trace-schema';

describe('Explore signal contracts', () => {
  it('strips unknown metric fields while retaining explicit console evidence', () => {
    expect(
      parseMetricConsole({
        context: null,
        query: 'up',
        datasource: 'prometheus',
        queryMode: 'manual',
        unknown: 'drop',
        results: {
          refId: 'A',
          status: 200,
          msg: null,
          frames: [
            {
              schema: { fields: [{ name: 'value', type: 'number', unit: null, extra: true }], labels: {}, meta: {} },
              data: [[1, 2]],
              extra: true
            }
          ]
        },
        stats: { totalSeries: 1, nonEmptySeries: 1, latestObservedAt: 2 },
        emptyStateReason: null,
        errorMessage: null
      })
    ).toEqual({
      context: null,
      query: 'up',
      datasource: 'prometheus',
      queryMode: 'manual',
      results: {
        refId: 'A',
        status: 200,
        msg: null,
        frames: [
          { schema: { fields: [{ name: 'value', type: 'number', unit: null }], labels: {}, meta: {} }, data: [[1, 2]] }
        ]
      },
      stats: { totalSeries: 1, nonEmptySeries: 1, latestObservedAt: 2 },
      emptyStateReason: null,
      errorMessage: null
    });
  });

  it.each([
    null,
    { results: { status: 200, frames: {} } },
    { results: { status: 200, frames: [{ schema: { fields: [{ type: 'object' }] }, data: [] }] } },
    { results: { status: 200, frames: [{ schema: null, data: [[1, Number.NaN]] }] } },
    { results: null, stats: { totalSeries: 1, nonEmptySeries: 2, latestObservedAt: null } }
  ])('rejects malformed metrics rather than turning them into empty evidence', value => {
    expect(() => parseMetricConsole(value)).toThrow(ExploreSignalContractError);
  });

  it('normalizes the stable four-field log page response', () => {
    expect(parseLogPage({ content: [], totalElements: 0, pageIndex: 0, pageSize: 20 }, 0, 20)).toEqual({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 20
    });
  });

  it('retains JSON-safe log body and attributes', () => {
    const page = parseLogPage(
      stableLogPage([
        {
          logRecordUid: 'event-10',
          timeUnixNano: '10',
          observedTimeUnixNano: null,
          severityNumber: 9,
          severityText: 'INFO',
          body: { event: ['paid', 1, true, null] },
          attributes: { nested: { ok: true } },
          droppedAttributesCount: 0,
          traceId: null,
          spanId: null,
          traceFlags: null,
          resource: {},
          resourceSchemaUrl: null,
          instrumentationScope: null,
          scopeSchemaUrl: null
        }
      ]),
      0,
      20
    );
    expect(page.content[0]?.body).toEqual({ event: ['paid', 1, true, null] });
  });

  it('rejects a numeric historical epoch timestamp instead of accepting rounded nanoseconds', () => {
    const epochNanos = 1_750_000_000_000_000_000;
    expect(() =>
      parseLogPage(
        stableLogPage([
          {
            logRecordUid: 'event-10',
            timeUnixNano: epochNanos,
            observedTimeUnixNano: epochNanos,
            severityNumber: null,
            severityText: null,
            body: null,
            attributes: null,
            droppedAttributesCount: null,
            traceId: null,
            spanId: null,
            traceFlags: null,
            resource: null,
            resourceSchemaUrl: null,
            instrumentationScope: null,
            scopeSchemaUrl: null
          }
        ]),
        0,
        20
      )
    ).toThrow(ExploreSignalContractError);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5])('rejects invalid Java Long value %s', timeUnixNano => {
    const value = {
      logRecordUid: null,
      timeUnixNano,
      observedTimeUnixNano: null,
      severityNumber: null,
      severityText: null,
      body: null,
      attributes: null,
      droppedAttributesCount: null,
      traceId: null,
      spanId: null,
      traceFlags: null,
      resource: null,
      resourceSchemaUrl: null,
      instrumentationScope: null,
      scopeSchemaUrl: null
    };
    let error: unknown;
    try {
      parseLogPage(stableLogPage([value]), 0, 20);
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(ExploreSignalContractError);
    expect(String(error)).not.toContain(String(timeUnixNano));
  });

  it('rejects log rows with missing nullable protocol keys', () => {
    expect(() => parseLogPage(stableLogPage([{ body: 'partial' }]), 0, 20)).toThrow(ExploreSignalContractError);
  });

  it.each([
    { ...stableLogPage([]), pageIndex: 1 },
    { ...stableLogPage([]), pageSize: 19 },
    { ...stableLogPage([]), totalElements: 1 },
    { ...stableLogPage([]), content: {} },
    { ...stableLogPage([]), number: 0, size: 20, totalPages: 0 }
  ])('rejects mismatched, malformed, or legacy log pages', value => {
    expect(() => parseLogPage(value, 0, 20)).toThrow(ExploreSignalContractError);
  });

  it('rejects content beyond the authoritative last-page remainder', () => {
    const content = Array.from({ length: 2 }, () => ({
      logRecordUid: null,
      timeUnixNano: null,
      observedTimeUnixNano: null,
      severityNumber: null,
      severityText: null,
      body: null,
      attributes: null,
      droppedAttributesCount: null,
      traceId: null,
      spanId: null,
      traceFlags: null,
      resource: null,
      resourceSchemaUrl: null,
      instrumentationScope: null,
      scopeSchemaUrl: null
    }));
    expect(() => parseLogPage({ content, totalElements: 21, pageIndex: 1, pageSize: 20 }, 1, 20)).toThrow(/content/);
  });

  it('keeps authoritative empty and out-of-range pages distinct', () => {
    expect(parseLogPage(stableLogPage([]), 0, 20)).toMatchObject({ content: [], totalElements: 0, number: 0 });
    expect(parseLogPage({ ...stableLogPage([]), pageIndex: 3, totalElements: 1 }, 3, 20)).toMatchObject({
      content: [],
      totalElements: 1,
      number: 3
    });
  });

  it('requires unique authoritative trace identities', () => {
    const trace = traceRow('0123456789abcdef0123456789abcdef');
    expect(() => parseTracePage(springPage([trace, trace]), 0, 20)).toThrow(/duplicate traceId/);
    expect(() => parseTracePage(springPage([{ ...trace, traceId: null }]), 0, 20)).toThrow(ExploreSignalContractError);
  });

  it('rejects unavailable trace statistics instead of accepting an incomplete success response', () => {
    expect(() =>
      parseTracePage(
        springPage([{ ...traceRow('0123456789abcdef0123456789abcdef'), spanCount: null, serviceStats: null }]),
        0,
        20
      )
    ).toThrow(ExploreSignalContractError);
  });

  it.each([{ spanCount: -1 }, { spanCount: 1.5 }, { spanCount: undefined }])(
    'rejects an invalid or missing trace span count',
    override => {
      expect(() =>
        parseTracePage(springPage([{ ...traceRow('0123456789abcdef0123456789abcdef'), ...override }]), 0, 20)
      ).toThrow(ExploreSignalContractError);
    }
  );

  it.each([
    { serviceStats: undefined },
    { spanCount: null },
    { serviceStats: null },
    { serviceStats: { checkout: { spanCount: 0, errorCount: 0 } } },
    { serviceStats: { checkout: { spanCount: 2, errorCount: 3 } } },
    { serviceStats: { checkout: { spanCount: 1, errorCount: 0 } }, spanCount: 2 },
    { serviceStats: { checkout: { spanCount: 1, errorCount: 0 } }, errorSpanCount: 1 }
  ])('rejects missing, invalid, or incomplete trace service statistics', override => {
    expect(() =>
      parseTracePage(springPage([{ ...traceRow('0123456789abcdef0123456789abcdef'), ...override }]), 0, 20)
    ).toThrow(ExploreSignalContractError);
  });
});

function springPage(content: unknown[]) {
  return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 20 };
}

function stableLogPage(content: unknown[]) {
  return { content, totalElements: content.length, pageIndex: 0, pageSize: 20 };
}

function traceRow(traceId: unknown) {
  return {
    rootState: 'missing',
    rootSpanCount: 0,
    representativeSpan: {
      spanId: '0123456789abcdef',
      spanName: null,
      serviceName: null,
      serviceNamespace: null,
      startTime: 1_750_000_001_000,
      durationNanos: 1_000_000
    },
    observedStartTime: 1_750_000_001_000,
    observedEndTime: 1_750_000_001_000 + Math.ceil(1_000_000 / 1_000_000),
    unattributedServiceStats: null,
    traceId,
    rootSpanId: null,
    serviceName: null,
    serviceNamespace: null,
    rootSpanName: null,
    durationNanos: null,
    status: null,
    startTime: null,
    errorSpanCount: 0,
    spanCount: 1,
    serviceStats: { checkout: { spanCount: 1, errorCount: 0 } },
    resourceAttributes: null
  };
}
