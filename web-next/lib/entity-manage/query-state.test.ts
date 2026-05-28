import { describe, expect, it } from 'vitest';
import {
  buildEntityListCompatRouteUrl,
  buildEntityUrl,
  queryStateFromParams,
  queryStateToQueryString,
  readEntityListQueryState
} from './query-state';

describe('entity query state codec', () => {
  it('builds entity list url from query state', () => {
    expect(buildEntityUrl({ search: 'checkout', type: 'service', status: 'unknown' })).toBe(
      '/entities?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&type=service&status=unknown'
    );
  });

  it('builds compact query string for active filters', () => {
    expect(queryStateToQueryString({ search: 'checkout', type: '', status: 'unknown' })).toBe('search=checkout&status=unknown');
  });

  it('builds entity list compatibility redirects with normalized query context', () => {
    expect(buildEntityListCompatRouteUrl()).toBe('/entities');
    expect(
      buildEntityListCompatRouteUrl({
        search: 'checkout',
        type: 'service',
        status: 'review',
        returnTo: '/trace/manage?returnLabel=Trace',
        returnLabel: 'Entity catalog'
      })
    ).toBe('/entities?search=checkout&type=service&status=review&returnTo=%2Ftrace%2Fmanage');
  });

  it('reads query state from search params', () => {
    const params = new URLSearchParams('search=checkout&type=service&status=unknown');
    expect(queryStateFromParams(params)).toEqual({
      search: 'checkout',
      type: 'service',
      status: 'unknown'
    });
  });

  it('normalizes multi-value URL search params into the first entity catalog query value', () => {
    expect(
      readEntityListQueryState({
        search: ['checkout', 'ignored'],
        type: ['service', 'host'],
        status: ['healthy', 'unknown'],
        returnLabel: 'Entity catalog'
      })
    ).toEqual({
      search: 'checkout',
      type: 'service',
      status: 'healthy'
    });
  });
});
