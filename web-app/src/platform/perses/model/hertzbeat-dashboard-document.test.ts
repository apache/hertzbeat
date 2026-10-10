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

import type { DashboardResource } from '@perses-dev/client';
import { expect, it } from 'vitest';
import fixture from './fixtures/supported-dashboard.json';
import { parseHertzBeatDashboardDocument } from './hertzbeat-dashboard-document';

it('accepts and retains the frozen standard four-panel document without inserting defaults', () => {
  const document = parseHertzBeatDashboardDocument(fixture);
  const standard: DashboardResource = document;
  expect(standard).toEqual(fixture);
});

it.each(['StatChart', 'GaugeChart', 'Table'])(
  'accepts a metric-backed %s panel while preserving the existing query contract',
  kind => {
    const document = structuredClone(fixture);
    document.spec.panels.jvm.spec.plugin = {
      kind,
      spec:
        kind === 'StatChart'
          ? { calculation: 'last-number', format: { unit: 'decimal' } }
          : kind === 'GaugeChart'
            ? { calculation: 'last-number', format: { unit: 'decimal' }, max: 100 }
            : { density: 'compact' }
    } as unknown as typeof document.spec.panels.jvm.spec.plugin;
    expect(parseHertzBeatDashboardDocument(document)).toEqual(document);
  }
);
it('rejects unsupported plugin fields instead of silently dropping them', () => {
  const input = structuredClone(fixture);
  Object.assign(input.spec.panels.jvm.spec.plugin.spec, { arbitraryDatasource: 'https://example.invalid' });
  expect(() => parseHertzBeatDashboardDocument(input)).toThrow();
});

const metricQuery = 'spec.panels.jvm.spec.queries.0.spec.plugin.spec.query';
const logQuery = 'spec.panels.logs.spec.queries.0.spec.plugin.spec.query';
const traceQuery = 'spec.panels.traces.spec.queries.0.spec.plugin.spec.query';
const ganttQuery = 'spec.panels.trace.spec.queries.0.spec.plugin.spec.query';

function changed(path: string, value: unknown) {
  const document = structuredClone(fixture);
  const keys = path.split('.');
  const key = keys.pop()!;
  let target = document as unknown as Record<string, unknown>;
  for (const part of keys) target = target[part] as Record<string, unknown>;
  target[key] = value;
  return document;
}

it.each([
  ['apiVersion', 'v1'],
  ['metadata.version', 1],
  ['metadata.project', 'external'],
  ['metadata.name', 'a'.repeat(76)],
  ['metadata.name', 'a/b'],
  ['metadata.tags', ['a', 'a']],
  ['metadata.tags', [' a']],
  ['metadata.tags', ['a'.repeat(65)]],
  ['spec.duration', '48h'],
  ['spec.refreshInterval', '5s'],
  ['spec.timezone', 'Not/AZone'],
  ['spec.datasources', {}],
  ['spec.display.name', ' '],
  ['spec.display.name', ' padded '],
  ['spec.display.name', '${serviceName}'],
  ['spec.display.description', '${environment}'],
  ['spec.variables.0.spec.value', '${environment}'],
  [logQuery + '.search', '$__range'],
  ['spec.display.description', 'x'.repeat(513)],
  ['spec.panels.trace.spec.plugin.kind', 'TracingGantt'],
  ['spec.panels.logs.spec.plugin.spec.allowWrap', 'true'],
  ['spec.panels.jvm.spec.queries.0.kind', 'LogQuery'],
  ['spec.panels.jvm.spec.queries.0.spec.plugin.kind', 'HertzBeatLogQuery'],
  ['spec.panels.jvm.spec.queries.0.spec.plugin.spec.version', 2],
  ['spec.panels.jvm.spec.queries.0.spec.plugin.spec.data', []],
  [metricQuery + '.timeWindow', { from: 1, to: 2 }],
  [metricQuery + '.limit', 33],
  [metricQuery + '.metric.name', 'select * from table'],
  [metricQuery + '.metric.stepSeconds', 86401],
  [metricQuery + '.context.entityId', '9223372036854775808'],
  [metricQuery + '.context.serviceName', 'alpha-${serviceName}'],
  [metricQuery + '.context.serviceName', '${environment}'],
  [metricQuery + '.context.serviceName', ' alpha '],
  [metricQuery + '.context.instance', '${serviceName}'],
  [logQuery + '.search', '${serviceName}'],
  [logQuery + '.search', ' padded '],
  [logQuery + '.limit', 1001],
  [traceQuery + '.sort', 'oldest'],
  [traceQuery + '.minDurationMs', -1],
  [ganttQuery + '.context', {}],
  [ganttQuery + '.traceId', 'ABC'],
  ['spec.variables.0.spec.value', ' padded '],
  ['spec.variables.0.spec.name', 'instance'],
  ['spec.variables.2.spec.allowMultiple', true],
  ['spec.variables.2.spec.defaultValue', 'unknown'],
  ['spec.variables.2.spec.plugin.kind', 'HertzBeatStaticListVariable'],
  ['spec.variables.2.spec.plugin.spec.version', 1],
  ['spec.variables.2.spec.plugin.spec.values', ['a', 'a']],
  ['spec.layouts.0.spec.items.0.x', 13],
  ['spec.layouts.0.spec.items.0.y', -1],
  ['spec.layouts.0.spec.items.0.width', 25],
  ['spec.layouts.0.spec.items.0.height', 0],
  ['spec.layouts.0.spec.items.0.content.$ref', '#/spec/panels/missing'],
  ['spec.layouts.0.spec.items.1.x', 0],
  ['spec.layouts.0.kind', 'Tabs']
])('rejects unsupported or lossy field %s', (path, value) => {
  expect(() => parseHertzBeatDashboardDocument(changed(path, value))).toThrow();
});

it('rejects missing variables, duplicate names, duplicate references and unplaced panels', () => {
  expect(() => parseHertzBeatDashboardDocument(changed('spec.variables', []))).toThrow();
  expect(() => parseHertzBeatDashboardDocument(changed('spec.variables.1', fixture.spec.variables[0]))).toThrow();
  expect(() =>
    parseHertzBeatDashboardDocument(changed('spec.layouts.0.spec.items.1.content.$ref', '#/spec/panels/jvm'))
  ).toThrow();
  expect(() => parseHertzBeatDashboardDocument(changed('spec.layouts.0.spec.items', []))).toThrow();
});

it('preserves descriptions and absent options, permits an empty text variable and adjacent rectangles', () => {
  const document = changed('spec.variables.0.spec.value', '');
  document.spec.display.description = '  Literal description  ';
  Reflect.deleteProperty(document.spec, 'refreshInterval');
  Reflect.deleteProperty(document.spec, 'timezone');
  expect(parseHertzBeatDashboardDocument(document)).toEqual(document);
});

it('rejects fields that JSON serialization would silently erase', () => {
  expect(() => parseHertzBeatDashboardDocument(changed('spec.timezone', undefined))).toThrow();
});

it('enforces serialized UTF-8 bytes rather than JavaScript character count', () => {
  const document = structuredClone(fixture);
  const template = structuredClone(document.spec.panels.logs);
  template.spec.display.name = 'é'.repeat(255);
  Object.assign(template.spec.display, { description: 'é'.repeat(512) });
  document.spec.panels = {} as typeof document.spec.panels;
  document.spec.layouts[0]!.spec.items = [];
  for (let index = 0; index < 24; index++) {
    Object.assign(document.spec.panels, { ['panel' + index]: structuredClone(template) });
    document.spec.layouts[0]!.spec.items.push({
      x: 0,
      y: index * 8,
      width: 24,
      height: 8,
      content: { $ref: '#/spec/panels/panel' + index }
    });
  }
  expect(JSON.stringify(document).length).toBeLessThan(65535);
  // Add bounded multi-byte query text to cross only the byte limit.
  for (const panel of Object.values(document.spec.panels)) {
    Object.assign(panel.spec.queries[0]!.spec.plugin.spec.query, { search: 'é'.repeat(512) });
  }
  expect(JSON.stringify(document).length).toBeLessThan(65535);
  expect(new TextEncoder().encode(JSON.stringify(document)).length).toBeGreaterThan(65535);
  expect(() => parseHertzBeatDashboardDocument(document)).toThrow('UTF-8');
});

it.each(['__proto__', 'constructor'])('validates an own %s panel parsed from JSON without silently dropping it', id => {
  const panels: unknown = JSON.parse(JSON.stringify(Object.fromEntries([[id, fixture.spec.panels.jvm]])));
  const document = {
    ...fixture,
    spec: {
      ...fixture.spec,
      panels,
      layouts: [
        {
          kind: 'Grid',
          spec: { items: [{ x: 0, y: 0, width: 24, height: 8, content: { $ref: '#/spec/panels/' + id } }] }
        }
      ]
    }
  };
  expect(Object.hasOwn(panels as object, id)).toBe(true);
  if (id === '__proto__') {
    expect(() => parseHertzBeatDashboardDocument(document)).toThrow('Reserved panel identifier');
  } else {
    expect(parseHertzBeatDashboardDocument(document)).toEqual(document);
  }
});

it('preserves typed log and trace table display columns and density', () => {
  const input = structuredClone(fixture);
  Object.assign(input.spec.panels.logs.spec.plugin.spec, {
    columns: [{ kind: 'message' }, { kind: 'field', scope: 'resource', path: ['service.name'] }],
    density: 'comfortable'
  });
  Object.assign(input.spec.panels.traces.spec.plugin.spec, { columns: ['traceName', 'service'], density: 'compact' });
  expect(parseHertzBeatDashboardDocument(input)).toEqual(input);
});

it.each([
  [{ kind: 'time' }],
  [{ kind: 'message' }, { kind: 'message' }],
  [{ kind: 'message' }, { kind: 'field', scope: 'resource', path: [] }],
  [{ kind: 'message' }, { kind: 'field', scope: 'resource', path: ['x'.repeat(257)] }],
  [{ kind: 'message', scope: 'resource' }]
])('rejects invalid log display descriptors %j', (...columns) => {
  expect(() =>
    parseHertzBeatDashboardDocument(changed('spec.panels.logs.spec.plugin.spec.columns', columns))
  ).toThrow();
});
it.each(['spans', 'groups'])('pairs TraceTable with the real %s population query', queryKind => {
  const query = {
    signal: 'traces',
    queryKind,
    limit: 100,
    ...(queryKind === 'groups'
      ? { population: 'matched_spans', groupBy: 'operationName', orderBy: 'error-count-desc' }
      : { sort: 'duration_desc' })
  };
  const input = changed(traceQuery, query);
  expect(parseHertzBeatDashboardDocument(input)).toEqual(input);
});
