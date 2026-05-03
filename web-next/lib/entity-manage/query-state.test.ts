import { describe, expect, it } from 'vitest';
import { buildEntityUrl, queryStateFromParams, queryStateToQueryString } from './query-state';

describe('entity query state codec', () => {
  it('builds entity list url from query state', () => {
    expect(buildEntityUrl({ search: 'checkout', type: 'service', status: 'unknown' })).toBe(
      '/entities?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&type=service&status=unknown'
    );
  });

  it('builds compact query string for active filters', () => {
    expect(queryStateToQueryString({ search: 'checkout', type: '', status: 'unknown' })).toBe('search=checkout&status=unknown');
  });

  it('reads query state from search params', () => {
    const params = new URLSearchParams('search=checkout&type=service&status=unknown');
    expect(queryStateFromParams(params)).toEqual({
      search: 'checkout',
      type: 'service',
      status: 'unknown'
    });
  });
});
