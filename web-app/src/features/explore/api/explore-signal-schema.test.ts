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

import { ExploreSignalContractError, ExploreSignalMissingError } from '../model/explore-signal-contract';
import { parseLogPage } from './explore-log-schema';
import { parseMetricConsole } from './explore-metric-schema';
import { parseTraceDetail, parseTracePage } from './explore-trace-schema';

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

  it('retains JSON-safe log body and attributes and strips unknown fields', () => {
    const page = parseLogPage(
      springPage([
        {
          timeUnixNano: 10,
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
          scopeSchemaUrl: null,
          secret: 'drop'
        }
      ]),
      0,
      20
    );
    expect(page.content[0]).not.toHaveProperty('secret');
    expect(page.content[0]?.body).toEqual({ event: ['paid', 1, true, null] });
  });

  it('accepts the lossy Java Long number representation used for epoch nanoseconds', () => {
    const epochNanos = 1_750_000_000_000_000_000;
    expect(
      parseLogPage(
        springPage([
          {
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
      ).content[0]?.timeUnixNano
    ).toBe(epochNanos);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5])('rejects invalid Java Long value %s', timeUnixNano => {
    const value = {
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
      parseLogPage(springPage([value]), 0, 20);
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(ExploreSignalContractError);
    expect(String(error)).not.toContain(String(timeUnixNano));
  });

  it('rejects log rows with missing nullable protocol keys', () => {
    expect(() => parseLogPage(springPage([{ body: 'partial' }]), 0, 20)).toThrow(ExploreSignalContractError);
  });

  it.each([
    { ...springPage([]), number: 1 },
    { ...springPage([]), size: 19 },
    { ...springPage([]), totalElements: 1, totalPages: 0 },
    { ...springPage([]), totalElements: 1, totalPages: 1 },
    { ...springPage([]), content: {} }
  ])('rejects mismatched or malformed Spring pages', value => {
    expect(() => parseLogPage(value, 0, 20)).toThrow(ExploreSignalContractError);
  });

  it('rejects content beyond the authoritative last-page remainder', () => {
    const content = Array.from({ length: 2 }, () => ({
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
    expect(() => parseLogPage({ content, totalElements: 21, totalPages: 2, number: 1, size: 20 }, 1, 20)).toThrow(
      /content/
    );
  });

  it('keeps authoritative empty and out-of-range pages distinct', () => {
    expect(parseLogPage(springPage([]), 0, 20)).toMatchObject({ content: [], totalElements: 0, number: 0 });
    expect(parseLogPage({ ...springPage([]), number: 3, totalElements: 1, totalPages: 1 }, 3, 20)).toMatchObject({
      content: [],
      totalElements: 1,
      number: 3
    });
  });

  it('requires unique authoritative trace identities', () => {
    const trace = traceRow('trace-1');
    expect(() => parseTracePage(springPage([trace, trace]), 0, 20)).toThrow(/duplicate traceId/);
    expect(() => parseTracePage(springPage([{ ...trace, traceId: null }]), 0, 20)).toThrow(ExploreSignalContractError);
  });

  it('treats null detail as missing and rejects identity drift', () => {
    expect(() => parseTraceDetail(null, 'trace-1')).toThrow(ExploreSignalMissingError);
    expect(() => parseTraceDetail({ ...traceRow('trace-2'), spans: null }, 'trace-1')).toThrow(/identity/);
  });

  it('parses nested trace evidence with allowlists', () => {
    const detail = parseTraceDetail(
      {
        ...traceRow('trace-1'),
        unknown: true,
        spans: [
          {
            traceId: 'trace-1',
            spanId: 'span-1',
            parentSpanId: null,
            spanName: 'GET',
            serviceName: 'checkout',
            status: 'OK',
            spanKind: 'SERVER',
            statusMessage: null,
            traceState: null,
            scopeName: null,
            scopeVersion: null,
            durationNanos: 2,
            startTime: 1,
            highlighted: false,
            resourceAttributes: {},
            spanAttributes: {},
            events: [
              { timeUnixNano: 1, name: 'event', attributes: { value: 1 }, droppedAttributesCount: 0, extra: true }
            ],
            links: [],
            codeNavigationHint: null,
            extra: true
          }
        ]
      },
      'trace-1'
    );
    expect(detail).not.toHaveProperty('unknown');
    expect(detail.spans?.[0]).not.toHaveProperty('extra');
    expect(detail.spans?.[0]?.events?.[0]).not.toHaveProperty('extra');
  });

  it.each([
    [[{ spanId: null, traceId: 'trace-1' }]],
    [[{ spanId: 'span-1', traceId: 'trace-2' }]],
    [
      [
        { spanId: 'span-1', traceId: 'trace-1' },
        { spanId: 'span-1', traceId: 'trace-1' }
      ]
    ]
  ])('rejects invalid canonical span identity %s', identities => {
    const spans = identities.map(identity => ({
      ...identity,
      parentSpanId: null,
      spanName: null,
      serviceName: null,
      status: null,
      spanKind: null,
      statusMessage: null,
      traceState: null,
      scopeName: null,
      scopeVersion: null,
      durationNanos: null,
      startTime: null,
      highlighted: false,
      resourceAttributes: null,
      spanAttributes: null,
      events: null,
      links: null,
      codeNavigationHint: null
    }));
    expect(() => parseTraceDetail({ ...traceRow('trace-1'), spans }, 'trace-1')).toThrow(ExploreSignalContractError);
  });
});

function springPage(content: unknown[]) {
  return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 20 };
}

function traceRow(traceId: unknown) {
  return {
    traceId,
    rootSpanId: null,
    serviceName: null,
    serviceNamespace: null,
    rootSpanName: null,
    durationNanos: null,
    status: null,
    startTime: null,
    errorSpanCount: 0,
    resourceAttributes: null
  };
}
