import { describe, expect, it } from 'vitest';
import {
  buildMonitorNewDefaultAppRedirectUrl,
  hasMonitorNewAppParam,
  readMonitorEditRouteState,
  readMonitorNewRouteState
} from './query-state';

describe('monitor editor query state', () => {
  it('normalizes multi-value URL search params into the first monitor new setup context value', () => {
    expect(
      readMonitorNewRouteState({
        app: ['prometheus', 'website'],
        labels: ['team=platform', 'team=ops'],
        pageIndex: ['2', '0'],
        pageSize: ['20', '8'],
        entityId: ['42', '99'],
        entityName: ['Checkout Service', 'Ignored Service'],
        timeRange: ['custom', '1h'],
        start: ['1715200000000', 'now-1h'],
        end: ['1715203600000', 'now'],
        refresh: ['30s', 'off'],
        live: ['true', 'false'],
        tz: ['UTC', 'Asia/Shanghai'],
        returnTo: ['/entities/42?returnLabel=Checkout', '//evil.example']
      })
    ).toEqual({
      app: 'prometheus',
      returnContext: {
        labels: 'team=platform',
        pageIndex: '2',
        pageSize: '20',
        entityId: '42',
        entityName: 'Checkout Service',
        timeRange: 'custom',
        start: '1715200000000',
        end: '1715203600000',
        refresh: '30s',
        live: 'true',
        tz: 'UTC',
        returnTo: '/entities/42'
      }
    });
  });

  it('defaults to the website monitor type when setup route query values are absent', () => {
    expect(readMonitorNewRouteState()).toEqual({
      app: 'website',
      returnContext: {
        labels: null,
        pageIndex: null,
        pageSize: null,
        entityId: null,
        entityName: null,
        timeRange: null,
        start: null,
        end: null,
        refresh: null,
        live: null,
        tz: null,
        returnTo: null
      }
    });
  });

  it('identifies whether the monitor new route already carries the Angular app selector', () => {
    expect(hasMonitorNewAppParam({ app: 'website' })).toBe(true);
    expect(hasMonitorNewAppParam({ app: ['prometheus', 'website'] })).toBe(true);
    expect(hasMonitorNewAppParam()).toBe(false);
    expect(hasMonitorNewAppParam({ app: '' })).toBe(false);
    expect(buildMonitorNewDefaultAppRedirectUrl()).toBe('/monitors/new?app=website');
  });

  it('normalizes multi-value URL search params into the first monitor edit return context value', () => {
    expect(
      readMonitorEditRouteState({
        labels: ['region=us-east', 'region=eu-west'],
        pageIndex: ['3', '0'],
        pageSize: ['50', '8'],
        entityId: ['101', '202'],
        entityName: ['Payment Gateway', 'Ignored Gateway'],
        timeRange: ['custom', '6h'],
        start: ['1715200000000', 'now-6h'],
        end: ['1715203600000', 'now'],
        refresh: ['60s', 'off'],
        live: ['false', 'true'],
        tz: ['Asia/Shanghai', 'UTC'],
        returnTo: ['/monitors?app=website&returnLabel=Monitors', '//evil.example']
      })
    ).toEqual({
      returnContext: {
        labels: 'region=us-east',
        pageIndex: '3',
        pageSize: '50',
        entityId: '101',
        entityName: 'Payment Gateway',
        timeRange: 'custom',
        start: '1715200000000',
        end: '1715203600000',
        refresh: '60s',
        live: 'false',
        tz: 'Asia/Shanghai',
        returnTo: '/monitors?app=website'
      }
    });
  });
});
