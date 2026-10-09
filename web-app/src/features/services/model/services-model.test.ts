/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { committedServiceQuery, serviceRead } from './services-model';
describe('service query submission', () => {
  it('commits the chosen shared preset only on Query and keeps selection when catalog filters do not change', () => {
    const source = { entityId: '7', start: 1000, end: 2000, timeZone: 'UTC' };
    expect(committedServiceQuery(source, { search: '', environment: '', range: '15m' }, 2000000)).toMatchObject({
      entityId: '7',
      start: 1100000,
      end: 2000000
    });
    expect(source).toEqual({ entityId: '7', start: 1000, end: 2000, timeZone: 'UTC' });
  });
  it('keeps an absolute return window and clears selected scope only for a changed list filter', () => {
    const source = {
      entityId: '7',
      start: 1000,
      end: 2000,
      timeZone: 'UTC',
      operation: 'checkout',
      view: 'performance',
      sort: 'name',
      order: 'asc',
      pageIndex: 2
    };
    expect(committedServiceQuery(source, { search: '', environment: '' }, 2000000)).toMatchObject(source);
    expect(committedServiceQuery(source, { search: 'changed', environment: '' }, 2000000)).toMatchObject({
      start: 1000,
      end: 2000,
      entityId: undefined,
      operation: undefined,
      view: 'performance',
      sort: 'name',
      order: 'asc'
    });
  });
  it('discards prior data on failed read or pending new scope', () => {
    expect(serviceRead({ data: 3, isFetching: false, isPending: false, error: new Error('failed') })).toEqual({
      kind: 'error'
    });
    expect(serviceRead({ data: undefined, isFetching: true, isPending: true, error: null })).toEqual({
      kind: 'loading'
    });
  });
});
