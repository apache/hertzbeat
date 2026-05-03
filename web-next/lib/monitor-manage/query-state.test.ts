import { describe, expect, it } from 'vitest';
import {
  applyMonitorWorkspaceDefaults,
  buildMonitorRouteUrl,
  buildMonitorUrl,
  queryStateFromParams
} from './query-state';

describe('monitor query state codec', () => {
  it('reads query state from search params', () => {
    const params = new URLSearchParams(
      'search=mysql&app=checkout&labels=team%3Dplatform&status=2&pageIndex=3&pageSize=20&entityId=42&entityName=Checkout&returnTo=%2Fentities%2F42%3FreturnLabel%3DCheckout&returnLabel=Checkout'
    );
    expect(queryStateFromParams(params)).toEqual({
      search: 'mysql',
      app: 'checkout',
      labels: 'team=platform',
      status: '2',
      pageIndex: '3',
      pageSize: '20',
      entityId: '42',
      entityName: 'Checkout',
      returnTo: '/entities/42'
    });
  });

  it('builds list url from query state', () => {
    expect(
      buildMonitorUrl({
        search: 'mysql',
        app: 'checkout',
        labels: 'team=platform',
        status: '2',
        pageIndex: '3',
        pageSize: '20',
        entityId: '42',
        entityName: 'Checkout',
        returnTo: '/entities/42'
      })
    ).toBe(
      '/monitors?pageIndex=3&pageSize=20&search=mysql&app=checkout&labels=team%3Dplatform&status=2&entityId=42&entityName=Checkout&returnTo=%2Fentities%2F42'
    );
  });

  it('builds a clean route url when empty', () => {
    expect(buildMonitorRouteUrl({ search: '', app: '', labels: '', status: '', pageIndex: '', pageSize: '', entityId: '', entityName: '', returnTo: '' })).toBe('/monitors');
  });

  it('keeps labels and pagination in the route url', () => {
    expect(
      buildMonitorRouteUrl({
        search: '',
        app: 'website',
        labels: 'team=platform',
        status: '',
        pageIndex: '1',
        pageSize: '50',
        entityId: '',
        entityName: '',
        returnTo: '/entities/42?returnLabel=Checkout Service'
      })
    ).toBe('/monitors?app=website&labels=team%3Dplatform&pageIndex=1&pageSize=50&returnTo=%2Fentities%2F42');
  });

  it('defaults entity workbench routes to down monitors until status is explicit', () => {
    expect(
      applyMonitorWorkspaceDefaults({
        search: '',
        app: 'website',
        labels: '',
        status: '',
        pageIndex: '',
        pageSize: '',
        entityId: '42',
        entityName: 'Checkout Service',
        returnTo: '/entities/42'
      })
    ).toEqual({
      search: '',
      app: 'website',
      labels: '',
      status: '2',
      pageIndex: '',
      pageSize: '',
      entityId: '42',
      entityName: 'Checkout Service',
      returnTo: '/entities/42'
    });

    expect(
      applyMonitorWorkspaceDefaults({
        search: '',
        app: 'website',
        labels: '',
        status: '1',
        pageIndex: '',
        pageSize: '',
        entityId: '42',
        entityName: 'Checkout Service',
        returnTo: '/entities/42'
      }).status
    ).toBe('1');

    expect(
      applyMonitorWorkspaceDefaults({
        search: '',
        app: 'website',
        labels: '',
        status: '',
        pageIndex: '',
        pageSize: '',
        entityId: '',
        entityName: '',
        returnTo: ''
      }).status
    ).toBe('');
  });
});
