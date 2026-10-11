/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect, it } from 'vitest';
import { calculatedFacetSelection } from '../model/explore-calculated-facet-action';
import { draftFromQuery, type LogExploreSubmissionDraft } from '../model/explore-submission-model';
import {
  buildCalculatedPageRequest,
  buildCalculatedTrendRequest,
  buildCalculatedAnalysisRequest,
  buildCalculatedFacetRequest,
  buildCalculatedValidationRequest,
  parseCalculatedPageResponse,
  parseCalculatedTrendResponse,
  parseCalculatedAnalysisResponse,
  parseCalculatedFacetResponse,
  parseCalculatedValidationResponse
} from './explore-log-calculated-v2-api';

it('builds full-window calculated analysis from the applied Timeseries grouping', () => {
  const analysis = JSON.stringify({
    version: 1,
    representation: 'timeseries',
    field: 'calculated:durationSeconds',
    limit: 20,
    order: 'count-desc',
    minCount: 1
  });
  const scoped = { ...query, start: 120_001, end: 240_000, logAnalysis: analysis };
  const request = buildCalculatedAnalysisRequest(scoped);
  expect(request.parameters).toEqual(buildCalculatedPageRequest(scoped).parameters);
  expect(request.operation).toEqual({
    kind: 'analysis',
    view: 'timeseries',
    grouping: [{ field: 'calculated:durationSeconds', limit: 20 }],
    measure: null,
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    intervalMs: 60_000
  });
});

it('strictly checks typed groups, bucket conservation and request echoes', () => {
  const analysis = JSON.stringify({
    version: 1,
    representation: 'timeseries',
    field: 'calculated:durationSeconds',
    limit: 20,
    order: 'count-desc',
    minCount: 1
  });
  const request = buildCalculatedAnalysisRequest({ ...query, start: 120_001, end: 240_000, logAnalysis: analysis });
  const response = {
    version: 2,
    window: { start: 120_001, end: 240_000 },
    executed: {
      parameters: request.parameters,
      calculatedFields: {
        version: 2,
        fields: [{ ...request.calculatedFields.fields[0], outputs: [{ name: 'durationSeconds', type: 'number' }] }]
      },
      operation: request.operation
    },
    result: {
      kind: 'analysis',
      view: 'timeseries',
      matchingTotal: 3,
      truncated: false,
      intervalMs: 60_000,
      groups: [
        {
          keys: [{ field: 'calculated:durationSeconds', kind: 'value', value: 1.5 }],
          count: 3,
          measurement: null,
          buckets: [
            { start: 120_000, count: 1, measurement: null },
            { start: 180_000, count: 1, measurement: null },
            { start: 240_000, count: 1, measurement: null }
          ]
        }
      ]
    }
  };
  expect(parseCalculatedAnalysisResponse(response, request).result.groups[0]?.keys[0]?.value).toBe(1.5);
  expect(() =>
    parseCalculatedAnalysisResponse(
      {
        ...response,
        result: {
          ...response.result,
          groups: [{ ...response.result.groups[0], buckets: response.result.groups[0]!.buckets.slice(1) }]
        }
      },
      request
    )
  ).toThrow();
  expect(() =>
    parseCalculatedAnalysisResponse(
      {
        ...response,
        result: {
          ...response.result,
          groups: [
            {
              ...response.result.groups[0],
              keys: [{ field: 'calculated:durationSeconds', kind: 'value', value: '1.5' }]
            }
          ]
        }
      },
      request
    )
  ).toThrow();
  expect(() =>
    parseCalculatedAnalysisResponse(
      { ...response, executed: { ...response.executed, operation: { ...request.operation, limit: 5 } } },
      request
    )
  ).toThrow();
});

it('requests typed calculated and raw facets against the same derived-filtered population', () => {
  const scoped = { ...query, start: 120_001, end: 240_000 };
  const page = buildCalculatedPageRequest(scoped);
  const derived = buildCalculatedFacetRequest(scoped, 'calculated:durationSeconds');
  const raw = buildCalculatedFacetRequest(scoped, 'builtin:serviceName', 'api');
  expect(derived.parameters).toEqual(page.parameters);
  expect(derived.operation).toEqual({ kind: 'facet', field: 'calculated:durationSeconds', limit: 20 });
  expect(raw.operation).toEqual({ kind: 'facet', field: 'builtin:serviceName', limit: 20, valueSearch: 'api' });
});

it('omits only a simple selected facet from its own value population', () => {
  const scoped = {
    ...query,
    start: 120_001,
    end: 240_000,
    serviceName: 'api',
    query: 'status:ERROR AND #durationSeconds:("0" OR "0.001") AND service:api'
  };
  const derived = buildCalculatedFacetRequest(scoped, 'calculated:durationSeconds');
  expect(derived.parameters.search).toBe('status:ERROR AND service:api');
  expect(derived.parameters.serviceName).toBe('api');
  expect(derived.parameters.start).toBe('120001');
  expect(derived.parameters.end).toBe('240000');
  const raw = buildCalculatedFacetRequest(scoped, 'builtin:serviceName');
  expect(raw.parameters.search).toBe('status:ERROR AND #durationSeconds:("0" OR "0.001")');
  const ambiguous = buildCalculatedFacetRequest(
    { ...scoped, query: 'service:api OR #durationSeconds:"0"' },
    'calculated:durationSeconds'
  );
  expect(ambiguous.parameters.search).toBe('service:api OR #durationSeconds:"0"');
});

it('keeps the same full facet population after two successive value selections', () => {
  const scoped = { ...query, start: 120_001, end: 240_000, query: 'status:ERROR' };
  const first = calculatedFacetSelection(
    draftFromQuery(scoped) as LogExploreSubmissionDraft,
    scoped,
    'calculated:durationSeconds',
    0,
    'single'
  ).update?.value;
  expect(first).toBe('status:ERROR AND #durationSeconds:"0"');
  const selected = { ...scoped, query: first! };
  const second = calculatedFacetSelection(
    draftFromQuery(selected) as LogExploreSubmissionDraft,
    selected,
    'calculated:durationSeconds',
    0.001,
    'toggle'
  ).update?.value;
  expect(second).toBe('status:ERROR AND #durationSeconds:("0" OR "0.001")');
  expect(buildCalculatedFacetRequest(selected, 'calculated:durationSeconds').parameters.search).toBe('status:ERROR');
  expect(
    buildCalculatedFacetRequest({ ...selected, query: second! }, 'calculated:durationSeconds').parameters.search
  ).toBe('status:ERROR');
});

it('keeps typed facet values and rejects wrong type, count, or executed field', () => {
  const request = buildCalculatedFacetRequest({ ...query, start: 120_001, end: 240_000 }, 'calculated:durationSeconds');
  const result = {
    version: 2,
    window: { start: 120_001, end: 240_000 },
    executed: {
      parameters: request.parameters,
      calculatedFields: {
        version: 2,
        fields: [{ ...request.calculatedFields.fields[0], outputs: [{ name: 'durationSeconds', type: 'number' }] }]
      },
      operation: request.operation
    },
    result: {
      kind: 'facet',
      field: 'calculated:durationSeconds',
      matchingTotal: 3,
      missingOrNullCount: 1,
      values: [{ value: 1.5, count: 2 }],
      truncated: false
    }
  };
  expect(parseCalculatedFacetResponse(result, request).result.values[0]?.value).toBe(1.5);
  expect(() =>
    parseCalculatedFacetResponse(
      { ...result, result: { ...result.result, values: [{ value: '1.5', count: 2 }] } },
      request
    )
  ).toThrow();
  expect(() =>
    parseCalculatedFacetResponse({ ...result, result: { ...result.result, missingOrNullCount: 0 } }, request)
  ).toThrow();
  expect(() =>
    parseCalculatedFacetResponse(
      {
        ...result,
        executed: { ...result.executed, operation: { ...request.operation, field: 'builtin:serviceName' } }
      },
      request
    )
  ).toThrow();
});

it('requests the same projected window for trend with a bounded explicit interval', () => {
  const scoped = { ...query, start: 120_001, end: 240_000 };
  const page = buildCalculatedPageRequest(scoped);
  const trend = buildCalculatedTrendRequest(scoped);
  expect(trend.parameters).toEqual(page.parameters);
  expect(trend.calculatedFields).toEqual(page.calculatedFields);
  expect(trend.operation).toEqual({ kind: 'trend', intervalMs: 60_000 });
});

it('accepts only the complete count grid bound to the executed request', () => {
  const request = buildCalculatedTrendRequest({ ...query, start: 120_001, end: 240_000 });
  const result = {
    version: 2,
    window: { start: 120_001, end: 240_000 },
    executed: {
      parameters: request.parameters,
      calculatedFields: {
        version: 2,
        fields: [{ ...request.calculatedFields.fields[0], outputs: [{ name: 'durationSeconds', type: 'number' }] }]
      },
      operation: request.operation
    },
    result: {
      kind: 'trend',
      intervalMs: 60_000,
      matchingTotal: 3,
      buckets: [
        { start: 120_000, count: 1 },
        { start: 180_000, count: 0 },
        { start: 240_000, count: 2 }
      ]
    }
  };
  expect(parseCalculatedTrendResponse(result, request).result.matchingTotal).toBe(3);
  expect(() =>
    parseCalculatedTrendResponse(
      { ...result, result: { ...result.result, buckets: result.result.buckets.slice(1) } },
      request
    )
  ).toThrow();
  expect(() =>
    parseCalculatedTrendResponse({ ...result, result: { ...result.result, matchingTotal: 2 } }, request)
  ).toThrow();
  expect(() =>
    parseCalculatedTrendResponse(
      { ...result, executed: { ...result.executed, parameters: { ...request.parameters, search: 'other' } } },
      request
    )
  ).toThrow();
});

const definitions = JSON.stringify({
  version: 2,
  nextFieldSeq: 2,
  fields: [{ id: 'c1', kind: 'formula', name: 'durationSeconds', expression: '@duration_ms / 1000' }]
});
const query = {
  signal: 'logs' as const,
  timeRange: 'last-15m' as const,
  query: 'service:api OR #durationSeconds:>=1',
  searchSyntax: 'structured-v2',
  logCalculatedV2: definitions,
  hideNoise: true
};
const log = {
  logRecordUid: 'event-1',
  timeUnixNano: '1750000000000000000',
  observedTimeUnixNano: null,
  severityNumber: 9,
  severityText: 'INFO',
  body: 'sample',
  attributes: { duration_ms: '1307' },
  droppedAttributesCount: 0,
  traceId: null,
  spanId: null,
  traceFlags: null,
  resource: {},
  resourceSchemaUrl: null,
  instrumentationScope: null,
  scopeSchemaUrl: null
};

it('builds a bounded page request from one search and omits draft lifecycle metadata', () => {
  expect(buildCalculatedPageRequest(query, 1_000_000)).toEqual({
    version: 2,
    parameters: {
      start: '100000',
      end: '1000000',
      hideNoise: 'true',
      searchSyntax: 'structured-v2',
      search: query.query
    },
    calculatedFields: {
      version: 2,
      fields: [{ id: 'c1', kind: 'formula', name: 'durationSeconds', expression: '@duration_ms / 1000' }]
    },
    operation: { kind: 'page', pageIndex: 0, pageSize: 20, sort: { field: 'timestamp', direction: 'desc' } }
  });
});

it('preserves a typed raw field sort in the calculated request', () => {
  const sorted = buildCalculatedPageRequest(
    {
      ...query,
      logSort: JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'asc' })
    },
    1_000_000
  );
  expect(sorted.operation.sort).toEqual({ field: 'attribute:duration', direction: 'asc', type: 'number' });
});

it('sorts a calculated output without sending an inferred type hint', () => {
  const sorted = buildCalculatedPageRequest({
    ...query,
    logSort: JSON.stringify({ version: 1, field: 'calculated:durationSeconds', type: 'number', direction: 'asc' })
  });
  expect(sorted.operation.sort).toEqual({ field: 'calculated:durationSeconds', direction: 'asc' });
});

it('decodes full-domain page wrappers by output name and rejects malformed values', () => {
  const request = buildCalculatedPageRequest(query, 1_000_000);
  const response = {
    version: 2,
    window: { start: 100000, end: 1000000 },
    executed: {
      parameters: request.parameters,
      calculatedFields: {
        version: 2,
        fields: [{ ...request.calculatedFields.fields[0], outputs: [{ name: 'durationSeconds', type: 'number' }] }]
      },
      operation: request.operation
    },
    result: { kind: 'page', totalElements: 1, rows: [{ log, derived: { durationSeconds: 1.307 } }] }
  };
  expect(parseCalculatedPageResponse(response, request).result.rows[0]?.derived).toEqual({ durationSeconds: 1.307 });
  expect(() =>
    parseCalculatedPageResponse(
      { ...response, result: { ...response.result, rows: [{ log, derived: { c1: 1.307 } }] } },
      request
    )
  ).toThrow();
  expect(() =>
    parseCalculatedPageResponse(
      { ...response, result: { ...response.result, rows: [{ log, derived: { durationSeconds: '1.307' } }] } },
      request
    )
  ).toThrow();
  expect(() =>
    parseCalculatedPageResponse(
      { ...response, executed: { ...response.executed, parameters: { ...request.parameters, search: 'other' } } },
      request
    )
  ).toThrow();
});

it('validates definitions without querying logs or sending lifecycle counters', () => {
  const request = buildCalculatedValidationRequest(definitions);
  expect(request).toEqual({
    version: 2,
    calculatedFields: {
      version: 2,
      fields: [{ id: 'c1', kind: 'formula', name: 'durationSeconds', expression: '@duration_ms / 1000' }]
    }
  });
  const output = { ...request.calculatedFields.fields[0], outputs: [{ name: 'durationSeconds', type: 'number' }] };
  expect(
    parseCalculatedValidationResponse(
      { version: 2, valid: true, executedDefinitions: { version: 2, fields: [output] }, preview: null, errors: [] },
      request
    ).valid
  ).toBe(true);
  expect(
    parseCalculatedValidationResponse(
      {
        version: 2,
        valid: false,
        executedDefinitions: null,
        preview: null,
        errors: [{ path: 'fields[0].expression', code: 'invalid_expression' }]
      },
      request
    ).valid
  ).toBe(false);
  expect(() =>
    parseCalculatedValidationResponse(
      {
        version: 2,
        valid: true,
        executedDefinitions: { version: 2, fields: [{ ...output, outputs: [{ name: 'c1', type: 'number' }] }] },
        preview: null,
        errors: []
      },
      request
    )
  ).toThrow();
});

it('decodes an explicit extraction preview with distinct null and empty captures', () => {
  const raw = JSON.stringify({
    version: 2,
    nextFieldSeq: 2,
    fields: [
      {
        id: 'c1',
        kind: 'extraction',
        engine: 'regex',
        source: 'builtin:body',
        pattern: '(?<token>GET)(?<optional>.*)',
        captures: [{ name: 'token' }, { name: 'optional' }]
      }
    ]
  });
  const request = buildCalculatedValidationRequest(raw, { definitionId: 'c1', sourceText: 'GET' });
  const output = {
    ...request.calculatedFields.fields[0],
    outputs: [
      { name: 'token', type: 'string' },
      { name: 'optional', type: 'string' }
    ]
  };
  const response = {
    version: 2,
    valid: true,
    executedDefinitions: { version: 2, fields: [output] },
    preview: { definitionId: 'c1', values: { token: 'GET', optional: '' } },
    errors: []
  };
  expect(parseCalculatedValidationResponse(response, request).preview?.values).toEqual({ token: 'GET', optional: '' });
  expect(
    parseCalculatedValidationResponse(
      { ...response, preview: { definitionId: 'c1', values: { token: null, optional: '' } } },
      request
    ).preview?.values.token
  ).toBeNull();
  expect(() =>
    parseCalculatedValidationResponse(
      { ...response, preview: { definitionId: 'c1', values: { token: 'GET' } } },
      request
    )
  ).toThrow();
});
