/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { toPersesLogData } from '@/platform/perses/runtime/perses-signal-data';
import type { LogFieldSort } from '@/shared/log-sort';
import { expect, it } from 'vitest';
import { i18n } from '@/core/i18n/i18n';
import { dashboardLogDisplay, dashboardTableViewParams, dashboardTraceDisplay } from './dashboard-table-display';
import type { CalculatedPageResponse } from '@/features/explore/model/explore-signal-contract';
it('keeps verified calculated cells aligned with the server order', () => {
  const rows = [
    { timeUnixNano: '1000000000', body: 'first' },
    { timeUnixNano: '2000000000', body: 'second' }
  ] as unknown as import('@/platform/perses').HertzBeatLogRow[];
  const calculated = {
    executed: { calculatedFields: { fields: [{ outputs: [{ name: 'upperService', type: 'string' }] }] } },
    result: { rows: [{ derived: { upperService: 'FIRST' } }, { derived: { upperService: 'SECOND' } }] }
  } as unknown as CalculatedPageResponse;
  const columns = dashboardLogDisplay(
    { kind: 'LogsTable', spec: {} },
    rows,
    i18n.t,
    'newest',
    'UTC',
    undefined,
    calculated
  ).columns!;
  const derived = columns.find(column => column.id === 'calculated:upperService')!;
  expect(derived.label).toBe('#upperService');
  expect(derived.getValue?.(0)).toBe('FIRST');
  expect(derived.getValue?.(1)).toBe('SECOND');
  expect(columns[2]!.getValue?.(0)).toBeUndefined();
});
it('restores custom log columns, density and wrapping without changing literal paths', () => {
  const plugin = {
    kind: 'LogsTable' as const,
    spec: {
      columns: [
        { kind: 'message' as const },
        { kind: 'field' as const, scope: 'resource' as const, path: ['service.name'] }
      ],
      density: 'comfortable' as const,
      allowWrap: true
    }
  };
  const value = dashboardLogDisplay(plugin, [], i18n.t);
  expect(value.density).toBe('comfortable');
  expect(value.wrap).toBe(true);
  expect(value.columns?.map(column => column.kind)).toEqual(['message', 'field']);
  expect(JSON.parse(dashboardTableViewParams(plugin).logView!)).toEqual({
    version: 1,
    columns: plugin.spec.columns,
    density: 'comfortable',
    wrap: true
  });
});
it('preserves the legacy hidden-time setting when returning to Explore', () => {
  expect(
    JSON.parse(dashboardTableViewParams({ kind: 'LogsTable', spec: { showTime: false } }).logView!).columns.some(
      (column: { kind: string }) => column.kind === 'time'
    )
  ).toBe(false);
});
it('restores trace display without fabricating a different population', () => {
  const plugin = {
    kind: 'TraceTable' as const,
    spec: { columns: ['traceName' as const, 'service' as const], density: 'comfortable' as const }
  };
  expect(dashboardTraceDisplay(plugin)).toEqual(plugin.spec);
  expect(dashboardTableViewParams(plugin)).toEqual({});
});
it('keeps exact nested field values aligned with the native sorted rows', () => {
  const rows = [
    { timeUnixNano: '1000000000', resource: { 'service.name': 0, service: { name: false } } },
    { timeUnixNano: '2000000000', resource: { 'service.name': 'later' } }
  ] as unknown as import('@/platform/perses').HertzBeatLogRow[];
  const plugin = {
    kind: 'LogsTable' as const,
    spec: {
      columns: [
        { kind: 'message' as const },
        { kind: 'field' as const, scope: 'resource' as const, path: ['service.name'] },
        { kind: 'field' as const, scope: 'resource' as const, path: ['service', 'name'] },
        { kind: 'field' as const, scope: 'resource' as const, path: ['toString'] }
      ]
    }
  };
  const columns = dashboardLogDisplay(plugin, rows, i18n.t, 'newest').columns!;
  expect(columns[1]!.getValue!(0)).toBe('later');
  expect(columns[1]!.getValue!(1)).toBe('0');
  expect(columns[2]!.getValue!(1)).toBe('false');
  expect(columns[3]!.getValue!(1)).toBeUndefined();
});

it('keeps custom display cells aligned with native field-sorted entries and labels the sorted column', () => {
  const rows = [
    { timeUnixNano: '1000000000', body: 'h', attributes: { 'proof.status': 599 } },
    { timeUnixNano: '3000000000', body: 'd', attributes: { 'proof.status': 501 } },
    { timeUnixNano: '2000000000', body: 'a', attributes: { 'proof.status': 500 } }
  ] as unknown as import('@/platform/perses').HertzBeatLogRow[];
  const logSort: LogFieldSort = { version: 1, field: 'attribute:proof.status', type: 'number', direction: 'desc' };
  const plugin = {
    kind: 'LogsTable' as const,
    spec: {
      columns: [
        { kind: 'time' as const },
        { kind: 'message' as const },
        { kind: 'field' as const, scope: 'attributes' as const, path: ['proof.status'] }
      ]
    }
  };
  const native = toPersesLogData({ rows, total: 3 }, { from: 1000, to: 3000 }, 'preserve');
  const columns = dashboardLogDisplay(plugin, rows, i18n.t, undefined, 'UTC', logSort).columns!;
  expect(native.entries.map((entry, index) => [entry.line, columns[2]!.getValue!(index)])).toEqual([
    ['h', '599'],
    ['d', '501'],
    ['a', '500']
  ]);
  expect(columns[2]!.ariaSort).toBe('descending');
  expect(columns[2]!.header).toBeDefined();
  expect(columns[0]!.ariaSort).toBeUndefined();
});
