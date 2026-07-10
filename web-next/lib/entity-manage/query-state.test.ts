import { describe, expect, it } from 'vitest';
import {
  buildEntityListCompatRouteUrl,
  buildEntityListRouteUrl,
  buildEntityUrl,
  ENTITY_LIST_PAGE_SIZE_OPTIONS,
  isSupportedEntityListPageSize,
  queryStateFromParams,
  queryStateToQueryString,
  readEntityListQueryState
} from './query-state';

describe('entity query state codec', () => {
  it('builds entity list url from query state', () => {
    expect(buildEntityUrl({ search: 'checkout', type: 'service', status: 'unknown', pageIndex: '2', pageSize: '20', source: 'entity-list-return' })).toBe(
      '/entities?pageIndex=2&pageSize=20&sort=gmtUpdate&order=desc&search=checkout&type=service&status=unknown'
    );
  });

  it('builds compact query string for active filters', () => {
    expect(queryStateToQueryString({ search: 'checkout', type: '', status: 'unknown', pageIndex: '2', source: 'entity-list-return', pageSize: '20' })).toBe('search=checkout&status=unknown&pageIndex=2&source=entity-list-return&pageSize=20');
  });

  it('keeps transient entity delete success state in route URLs but out of backend API URLs', () => {
    const query = { search: '', type: '', status: '', source: 'entity-delete-return', deleteResult: 'success', deletedEntity: '42' };

    expect(buildEntityListRouteUrl(query)).toBe('/entities?source=entity-delete-return&deleteResult=success&deletedEntity=42');
    expect(buildEntityUrl(query)).toBe('/entities?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc');
  });

  it('builds entity list route URLs with source context kept out of the backend API URL', () => {
    const query = { search: 'checkout', type: 'service', status: '', pageIndex: '1', source: 'entity-create-return', pageSize: '20' };

    expect(buildEntityListRouteUrl(query)).toBe('/entities?search=checkout&type=service&pageIndex=1&source=entity-create-return&pageSize=20');
    expect(buildEntityUrl(query)).toBe('/entities?pageIndex=1&pageSize=20&sort=gmtUpdate&order=desc&search=checkout&type=service');
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
      status: 'unknown',
      pageIndex: '',
      source: '',
      returnTo: '',
      pageSize: '',
      timeRange: '',
      start: '',
      end: '',
      refresh: '',
      live: '',
      tz: '',
      probe: '',
      monitorId: '',
      monitorName: '',
      monitorApp: '',
      monitorInstance: '',
      deleteResult: '',
      deletedEntity: ''
    });
  });

  it('normalizes multi-value URL search params into the first entity catalog query value', () => {
    expect(
      readEntityListQueryState({
        search: ['checkout', 'ignored'],
        type: ['service', 'host'],
        status: ['healthy', 'unknown'],
        pageIndex: ['3', 'ignored'],
        pageSize: ['50', 'ignored'],
        returnLabel: 'Entity catalog'
      })
    ).toEqual({
      search: 'checkout',
      type: 'service',
      status: 'healthy',
      pageIndex: '3',
      source: '',
      returnTo: '',
      pageSize: '50',
      timeRange: '',
      start: '',
      end: '',
      refresh: '',
      live: '',
      tz: '',
      probe: '',
      monitorId: '',
      monitorName: '',
      monitorApp: '',
      monitorInstance: '',
      deleteResult: '',
      deletedEntity: ''
    });
  });

  it('keeps page size in entity route query state for return-to handoffs', () => {
    const params = new URLSearchParams('search=checkout&pageIndex=2&source=entity-create-return&returnTo=%2Fentities%2Fdiscovery%3Fsearch%3Dcheckout-http%26returnLabel%3DDiscovery&pageSize=20&timeRange=last-30m&live=false&probe=create-delete-cleanup&monitorId=632051474676992&monitorName=checkout-http&monitorApp=website&monitorInstance=example.com%3A443');

    expect(queryStateFromParams(params)).toEqual({
      search: 'checkout',
      type: '',
      status: '',
      pageIndex: '2',
      source: 'entity-create-return',
      returnTo: '/entities/discovery?search=checkout-http',
      pageSize: '20',
      timeRange: 'last-30m',
      start: '',
      end: '',
      refresh: '',
      live: 'false',
      tz: '',
      probe: 'create-delete-cleanup',
      monitorId: '632051474676992',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: 'example.com:443',
      deleteResult: '',
      deletedEntity: ''
    });
    expect(buildEntityListRouteUrl(queryStateFromParams(params))).toBe('/entities?search=checkout&pageIndex=2&source=entity-create-return&returnTo=%2Fentities%2Fdiscovery%3Fsearch%3Dcheckout-http&pageSize=20&timeRange=last-30m&live=false&probe=create-delete-cleanup&monitorId=632051474676992&monitorName=checkout-http&monitorApp=website&monitorInstance=example.com%3A443');
    expect(buildEntityUrl(queryStateFromParams(params))).toBe('/entities?pageIndex=2&pageSize=20&sort=gmtUpdate&order=desc&search=checkout');
  });

  it('normalizes unsupported entity pagination values before backend reads', () => {
    expect(buildEntityUrl({ search: '', type: '', status: '', pageIndex: '-1', pageSize: '999' })).toBe(
      '/entities?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc'
    );
    expect(ENTITY_LIST_PAGE_SIZE_OPTIONS).toEqual([8, 20, 50]);
    expect(isSupportedEntityListPageSize('50')).toBe(true);
    expect(isSupportedEntityListPageSize('100')).toBe(false);
  });
});
