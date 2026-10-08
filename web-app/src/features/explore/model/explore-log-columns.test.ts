/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { logColumnId, logColumnLabel, logColumnValue, validLogColumns } from './explore-log-columns';
import type { TFunction } from 'i18next';
import type { LogRow } from './explore-signal-contract';
it('requires unique bounded columns including message', () => {
  expect(validLogColumns([{ kind: 'message' }])).toBe(true);
  expect(validLogColumns([{ kind: 'time' }])).toBe(false);
  expect(validLogColumns([{ kind: 'message' }, { kind: 'message' }])).toBe(false);
  expect(
    validLogColumns([
      { kind: 'message' },
      ...Array.from({ length: 8 }, (_, i) => ({ kind: 'field', scope: 'resource', path: [String(i)] }))
    ])
  ).toBe(false);
});
it('keeps exact path identity, own fields and truthful false/zero/missing', () => {
  const row = { resource: { 'service.name': 0, service: { name: false } } } as unknown as LogRow;
  const flat = { kind: 'field', scope: 'resource', path: ['service.name'] } as const;
  const nested = { kind: 'field', scope: 'resource', path: ['service', 'name'] } as const;
  expect(logColumnId({ ...flat, path: [...flat.path] })).not.toBe(logColumnId({ ...nested, path: [...nested.path] }));
  expect(logColumnValue(row, { ...flat, path: [...flat.path] })).toBe('0');
  expect(logColumnValue(row, { ...nested, path: [...nested.path] })).toBe('false');
  expect(logColumnValue(row, { kind: 'field', scope: 'resource', path: ['toString'] })).toBeUndefined();
});

it('uses raw searchable names when header standardization is disabled', () => {
  const t = ((key: string) => key) as TFunction;
  expect(logColumnLabel({ kind: 'service' }, t, false)).toBe('service');
  expect(logColumnLabel({ kind: 'severity' }, t, false)).toBe('severity');
  expect(logColumnLabel({ kind: 'time' }, t, false)).toBe('explore.logColumns.fields.time');
  expect(logColumnLabel({ kind: 'message' }, t, false)).toBe('explore.logColumns.fields.message');
  expect(logColumnLabel({ kind: 'field', scope: 'attributes', path: ['error', 'message'] }, t, false)).toBe(
    '@error.message'
  );
  expect(logColumnLabel({ kind: 'field', scope: 'resource', path: ['host', 'name'] }, t, false)).toBe('host');
  expect(logColumnLabel({ kind: 'field', scope: 'resource', path: ['host', 'name'] }, t)).toBe(
    'explore.logFacets.core.host'
  );
});
