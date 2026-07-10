import { describe, expect, it } from 'vitest';
import {
  MONITOR_LIST_PAGE_SIZE_OPTIONS,
  applyMonitorWorkspaceDefaults,
  buildMonitorRouteUrl,
  buildMonitorUrl,
  isSupportedMonitorListPageSize,
  queryStateFromParams,
  readMonitorManageRouteState
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
      source: '',
      timeRange: '',
      start: '',
      end: '',
      refresh: '',
      live: '',
      tz: '',
      probe: '',
      returnTo: '/entities/42'
    });
  });

  it('honors the legacy Angular content query before search and canonicalizes it', () => {
    const params = new URLSearchParams('content=mysql-primary&search=ignored&app=mysql');

    expect(queryStateFromParams(params)).toMatchObject({
      search: 'mysql-primary',
      app: 'mysql'
    });

    expect(readMonitorManageRouteState({ content: 'mysql-primary', search: 'ignored', app: 'mysql' })).toMatchObject({
      query: {
        search: 'mysql-primary',
        app: 'mysql'
      },
      canonicalRoute: '/monitors?search=mysql-primary&app=mysql',
      shouldRedirect: true
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
        source: 'monitor-list',
        returnTo: '/entities/42'
      })
    ).toBe(
      '/monitors?pageIndex=3&pageSize=20&search=mysql&app=checkout&labels=team%3Dplatform&status=2&entityId=42&entityName=Checkout&returnTo=%2Fentities%2F42'
    );
  });

  it('normalizes unsupported page sizes to the dense monitor table options', () => {
    expect(MONITOR_LIST_PAGE_SIZE_OPTIONS).toEqual([8, 20, 50]);
    expect(isSupportedMonitorListPageSize('50')).toBe(true);
    expect(isSupportedMonitorListPageSize('1000')).toBe(false);

    const query = {
      search: 'checkout',
      app: 'website',
      labels: '',
      status: '',
      pageIndex: '0',
      pageSize: '1000',
      entityId: '',
      entityName: '',
      source: 'product-design-scale',
      returnTo: ''
    };

    expect(buildMonitorUrl(query)).toBe('/monitors?pageIndex=0&pageSize=8&search=checkout&app=website');
    expect(buildMonitorRouteUrl(query)).toBe('/monitors?search=checkout&app=website&pageIndex=0&pageSize=8&source=product-design-scale');
  });

  it('redirects unsupported page-size URLs to the canonical monitor list state', () => {
    expect(
      readMonitorManageRouteState({
        search: 'checkout',
        app: 'website',
        pageIndex: '0',
        pageSize: '1000',
        source: 'product-design-scale'
      })
    ).toMatchObject({
      query: {
        search: 'checkout',
        app: 'website',
        pageIndex: '0',
        pageSize: '1000',
        source: 'product-design-scale'
      },
      canonicalRoute: '/monitors?search=checkout&app=website&pageIndex=0&pageSize=8&source=product-design-scale',
      shouldRedirect: true
    });
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
        source: '',
        returnTo: '/entities/42?returnLabel=Checkout Service'
      })
    ).toBe('/monitors?app=website&labels=team%3Dplatform&pageIndex=1&pageSize=50&returnTo=%2Fentities%2F42');
  });

  it('keeps source in route urls so edit return targets preserve browser validation context', () => {
    expect(
      buildMonitorRouteUrl({
        search: 'uv-monitor',
        app: 'website',
        labels: '',
        status: '',
        pageIndex: '',
        pageSize: '8',
        entityId: '',
        entityName: '',
        source: 'monitor-edit-create-return',
        returnTo: ''
      })
    ).toBe('/monitors?search=uv-monitor&app=website&pageSize=8&source=monitor-edit-create-return');
  });

  it('keeps time and probe context in route urls for row edit return targets', () => {
    expect(
      buildMonitorRouteUrl({
        search: 'uv-monitor',
        app: 'website',
        labels: '',
        status: '',
        pageIndex: '',
        pageSize: '8',
        entityId: '',
        entityName: '',
        source: 'monitor-edit-create-return',
        timeRange: 'last-30m',
        live: 'false',
        probe: 'create-edit-cancel-cleanup-return',
        returnTo: ''
      })
    ).toBe(
      '/monitors?search=uv-monitor&app=website&pageSize=8&source=monitor-edit-create-return&timeRange=last-30m&live=false&probe=create-edit-cancel-cleanup-return'
    );
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
        source: '',
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
      source: '',
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
        source: '',
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

  it('keeps non-entity return targets out of the entity workbench mode', () => {
    const query = applyMonitorWorkspaceDefaults({
      search: 'uv-monitor',
      app: 'website',
      labels: '',
      status: '',
      pageIndex: '',
      pageSize: '8',
      entityId: '',
      entityName: '',
      source: 'monitor-row-delete-cancel',
      returnTo: '/setting/labels?search=uv-monitor'
    });

    expect(query).toMatchObject({
      search: 'uv-monitor',
      app: 'website',
      status: '',
      pageSize: '8',
      source: 'monitor-row-delete-cancel',
      returnTo: '/setting/labels?search=uv-monitor'
    });
    expect(buildMonitorRouteUrl(query)).toBe(
      '/monitors?search=uv-monitor&app=website&pageSize=8&source=monitor-row-delete-cancel&returnTo=%2Fsetting%2Flabels%3Fsearch%3Duv-monitor'
    );
  });

  it('normalizes multi-value URL search params into the first monitor manage query value', () => {
    expect(
      readMonitorManageRouteState({
        search: ['mysql', 'ignored'],
        app: ['website', 'ignored'],
        labels: ['team=platform', 'ignored'],
        status: ['2', '1'],
        pageIndex: ['3', '0'],
        pageSize: ['20', '8'],
        entityId: ['42', '43'],
        entityName: ['Checkout', 'Other'],
        returnTo: ['/entities/42?returnLabel=Checkout', '/entities/43'],
        returnLabel: 'Checkout'
      })
    ).toMatchObject({
      query: {
        search: 'mysql',
        app: 'website',
        labels: 'team=platform',
        status: '2',
        pageIndex: '3',
        pageSize: '20',
        entityId: '42',
        entityName: 'Checkout',
        returnTo: '/entities/42'
      },
      explicitStatus: '2',
      canonicalRoute:
        '/monitors?search=mysql&app=website&labels=team%3Dplatform&status=2&pageIndex=3&pageSize=20&entityId=42&entityName=Checkout&returnTo=%2Fentities%2F42',
      shouldRedirect: true
    });
  });

  it('canonicalizes display-only return labels out of monitor manage route state', () => {
    expect(
      readMonitorManageRouteState({
        app: 'website',
        entityId: '42',
        entityName: 'Checkout Service',
        returnTo: '/entities/42?returnLabel=Checkout',
        returnLabel: 'Checkout'
      })
    ).toMatchObject({
      query: {
        app: 'website',
        status: '2',
        entityId: '42',
        entityName: 'Checkout Service',
        returnTo: '/entities/42'
      },
      explicitStatus: '',
      canonicalRoute: '/monitors?app=website&status=2&entityId=42&entityName=Checkout+Service&returnTo=%2Fentities%2F42',
      shouldRedirect: true
    });
  });
});
