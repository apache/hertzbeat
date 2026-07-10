import { describe, expect, it } from 'vitest';
import { readEntityDetailCreatedResult, readEntityDetailRouteContext, readEntityDetailUpdatedResult } from './query-state';

describe('entity detail query state', () => {
  it('normalizes multi-value URL search params into the first entity detail inherited context value', () => {
    expect(
      readEntityDetailRouteContext({
        timeRange: ['last-45m', 'last-1h'],
        start: ['1713200000000', 'ignored'],
        end: ['1713202700000', 'ignored'],
        refresh: ['30', '60'],
        live: ['false', 'true'],
        tz: ['Asia/Shanghai', 'UTC'],
        source: ['monitor', 'trace'],
        monitorId: ['632051474676992', '632051474676993'],
        monitorName: ['checkout-http', 'ignored'],
        monitorApp: ['website', 'ignored'],
        monitorInstance: ['example.com:443', 'ignored'],
        returnTo: ['/trace/manage?returnLabel=Trace', '/log/manage'],
        returnLabel: 'Trace'
      })
    ).toEqual({
      timeRange: 'last-45m',
      start: '1713200000000',
      end: '1713202700000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'monitor',
      monitorId: '632051474676992',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: 'example.com:443',
      returnTo: '/trace/manage'
    });
  });

  it('drops invalid inherited entity and monitor ids before they reach the detail surface', () => {
    expect(
      readEntityDetailRouteContext({
        entityId: '12.34',
        monitorId: '56.78',
        entityName: 'checkout-api'
      })
    ).toEqual({
      entityName: 'checkout-api'
    });
  });

  it('reads the post-create success result without adding it to signal handoff context', () => {
    expect(readEntityDetailCreatedResult({ created: '1' })).toBe(true);
    expect(readEntityDetailCreatedResult({ created: ['true', '0'] })).toBe(true);
    expect(readEntityDetailCreatedResult({ created: '0' })).toBe(false);

    expect(readEntityDetailRouteContext({ created: '1', source: 'entity-create' })).toEqual({
      source: 'entity-create'
    });
  });

  it('reads the post-edit readback result without adding it to signal handoff context', () => {
    expect(readEntityDetailUpdatedResult({ updated: '1' })).toBe(true);
    expect(readEntityDetailUpdatedResult({ updated: ['true', '0'] })).toBe(true);
    expect(readEntityDetailUpdatedResult({ updated: '0' })).toBe(false);

    expect(readEntityDetailRouteContext({ updated: '1', source: 'entity-edit' })).toEqual({
      source: 'entity-edit'
    });
  });
});
