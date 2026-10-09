/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { buildServicesPath, canonicalServicesReturnPath, parseServicesQuery } from './services-path';
const scope = { start: 1000, end: 61000, timeZone: 'UTC', search: 'checkout', environmentFilter: 'prod', pageIndex: 2 };
describe('service directory route enums', () => {
  it.each([{ view: 'unknown' }, { sort: 'risk' }, { order: 'down' }])(
    'normalizes malformed direct scope %o without retaining its page',
    invalid => {
      const path = buildServicesPath({ ...scope, ...invalid });
      const parsed = parseServicesQuery(new URL(path, 'https://hertzbeat.local').searchParams);
      expect(parsed).toMatchObject({ search: 'checkout', environmentFilter: 'prod', start: 1000, end: 61000 });
      expect(parsed.pageIndex).toBeUndefined();
      for (const key of Object.keys(invalid) as Array<keyof typeof invalid>) expect(parsed[key]).toBeUndefined();
      expect(canonicalServicesReturnPath(path)).toBeUndefined();
    }
  );
  it.each(['performance', 'registered'])('preserves valid %s context exactly', view => {
    const query = { ...scope, view, sort: 'latencyP95Ms', order: 'asc' };
    const path = buildServicesPath(query);
    expect(parseServicesQuery(new URL(path, 'https://hertzbeat.local').searchParams)).toEqual(query);
    expect(canonicalServicesReturnPath(path)).toBe(path);
  });
});
