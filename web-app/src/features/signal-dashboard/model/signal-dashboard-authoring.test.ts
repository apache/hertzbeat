/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import {
  appendDashboardPanel,
  blankDashboard,
  copyDashboard,
  updateDashboardLayout,
  removeDashboardPanel,
  projectDashboardItems
} from './signal-dashboard-authoring';

it('creates a valid empty standard document and copies without changing the original', () => {
  const blank = blankDashboard('stable-new-key', 'New dashboard');
  expect(parseHertzBeatDashboardDocument(blank)).toEqual(blank);
  expect(blank.spec.panels).toEqual({});
  const original = parseHertzBeatDashboardDocument(fixture);
  const copy = copyDashboard(original, 'stable-copy-key', 'Copy');
  expect(copy.metadata.name).toBe('stable-copy-key');
  expect(copy.spec.panels).toEqual(original.spec.panels);
  expect(original).toEqual(fixture);
});

it('appends a new unique panel below existing geometry without rewriting untouched fields', () => {
  const original = parseHertzBeatDashboardDocument(fixture);
  const next = appendDashboardPanel(original, original, 'new-panel', 'logs');
  expect(Object.keys(next.spec.panels)).toHaveLength(5);
  expect(next.spec.panels['new-panel']).toEqual(original.spec.panels.logs);
  expect(next.spec.layouts[0].spec.items.at(-1)).toMatchObject({ x: 0, y: 16, width: 24 });
  expect(original).toEqual(fixture);
});

it('rejects a conflicting incoming variable instead of changing the new panel scope', () => {
  const original = parseHertzBeatDashboardDocument(fixture);
  const incoming = structuredClone(original);
  incoming.spec.variables[0]!.spec.name = 'environment';
  expect(() => appendDashboardPanel(original, incoming, 'new-panel', 'logs')).toThrow();
  expect(original).toEqual(fixture);
});

it('accepts an explicit valid layout but rejects overlaps without mutating the original', () => {
  const original = parseHertzBeatDashboardDocument(fixture);
  const items = structuredClone(original.spec.layouts[0].spec.items);
  items[0]!.height = 7;
  expect(updateDashboardLayout(original, items).spec.layouts[0].spec.items[0]!.height).toBe(7);
  items[0]!.height = 9;
  expect(() => updateDashboardLayout(original, items)).toThrow();
  expect(original).toEqual(fixture);
});

it('projects mixed-height panels cumulatively on narrow screens without changing canonical geometry', () => {
  const original = parseHertzBeatDashboardDocument(fixture).spec.layouts[0].spec.items;
  original[0]!.height = 12;
  original[1]!.height = 4;
  const snapshot = structuredClone(original);
  const projected = projectDashboardItems(original, true);
  expect(projected[0]!.y).toBe(0);
  expect(projected[1]!.y).toBe(12);
  expect(projected[2]!.y).toBe(16);
  expect(original).toEqual(snapshot);
});

it('copies a maximum-length valid name without throwing or changing its source', () => {
  const original = blankDashboard('source', 'a'.repeat(255));
  const next = copyDashboard(original, 'copy', original.spec.display.name + ' copy');
  expect(next.metadata.name).toBe('copy');
  expect(next.spec.display.name).toBe(original.spec.display.name);
  expect(original.metadata.name).toBe('source');
});

it('removes a panel while another query is an invalid local draft, without claiming it is valid', () => {
  const draft = parseHertzBeatDashboardDocument(structuredClone(fixture));
  const query = draft.spec.panels.jvm!.spec.queries[0].spec.plugin.spec.query;
  if (query.signal !== 'metrics' || query.queryKind !== 'time-series') throw new Error('Metric fixture');
  query.metric.name = '';
  const next = removeDashboardPanel(draft, 'logs');
  expect(next.spec.panels.logs).toBeUndefined();
  expect(next.spec.layouts[0].spec.items.some(item => item.content.$ref.endsWith('/logs'))).toBe(false);
  expect(() => parseHertzBeatDashboardDocument(next)).toThrow();
  expect(draft.spec.panels.logs).toBeDefined();
});

it('retains the incoming analytical height when adding to a new or existing dashboard', () => {
  const incoming = parseHertzBeatDashboardDocument(fixture);
  const source = incoming.spec.layouts[0].spec.items.find(item => item.content.$ref === '#/spec/panels/logs')!;
  source.height = 16;
  source.y = 20;
  for (const target of [blankDashboard('empty-target', 'Empty target'), parseHertzBeatDashboardDocument(fixture)]) {
    const result = appendDashboardPanel(target, incoming, 'analysis-panel', 'logs');
    expect(result.spec.layouts[0].spec.items.at(-1)).toMatchObject({ x: 0, width: 24, height: 16 });
    expect(result.spec.layouts[0].spec.items.at(-1)?.y).toBe(target.spec.layouts[0].spec.items.length ? 16 : 0);
  }
  expect(source).toMatchObject({ height: 16, y: 20 });
});
