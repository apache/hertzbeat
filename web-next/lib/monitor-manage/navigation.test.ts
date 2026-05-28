import { describe, expect, it } from 'vitest';
import {
  buildMonitorDetailHref,
  buildMonitorEditHref,
  buildMonitorListCompatRouteUrl,
  buildMonitorListReturnHref,
  buildMonitorEntityReturnHref,
  buildMonitorNewHref,
  resolveMonitorCheckboxSelection
} from './navigation';

describe('monitor manage navigation', () => {
  it('builds detail and edit hrefs for a monitor row', () => {
    expect(buildMonitorDetailHref(42)).toBe('/monitors/42');
    expect(buildMonitorEditHref(42)).toBe('/monitors/42/edit');
  });

  it('preserves list workspace context in detail/edit/new hrefs', () => {
    const context = {
      app: 'website',
      labels: 'team=platform',
      pageIndex: '1',
      pageSize: '20',
      entityId: '42',
      entityName: 'Checkout Service',
      returnTo: '/entities/42?returnLabel=Checkout Service'
    };
    expect(buildMonitorDetailHref(42, context)).toBe(
      '/monitors/42?app=website&labels=team%3Dplatform&pageIndex=1&pageSize=20&entityId=42&entityName=Checkout+Service&returnTo=%2Fentities%2F42'
    );
    expect(buildMonitorEditHref(42, context)).toBe(
      '/monitors/42/edit?app=website&labels=team%3Dplatform&pageIndex=1&pageSize=20&entityId=42&entityName=Checkout+Service&returnTo=%2Fentities%2F42'
    );
    expect(buildMonitorNewHref(context)).toBe(
      '/monitors/new?app=website&labels=team%3Dplatform&pageIndex=1&pageSize=20&entityId=42&entityName=Checkout+Service&returnTo=%2Fentities%2F42'
    );
  });

  it('builds the entity return href from explicit return routes or entity context', () => {
    expect(
      buildMonitorEntityReturnHref({
        returnTo: '/entities/42?tab=evidence&returnLabel=Checkout Service',
        entityId: '42'
      })
    ).toBe('/entities/42?tab=evidence');

    expect(
      buildMonitorEntityReturnHref({
        returnTo: '//evil.example/steal-session',
        entityId: '42'
      })
    ).toBe('/entities/42');

    expect(
      buildMonitorEntityReturnHref({
        entityId: '42',
        entityName: 'Checkout Service'
      })
    ).toBe('/entities/42');

    expect(buildMonitorEntityReturnHref()).toBe('/entities');
  });

  it('builds the monitor list return href from explicit return routes or preserved list context', () => {
    expect(
      buildMonitorListReturnHref({
        returnTo: '/monitors?search=checkout&status=2',
        app: 'website',
        labels: 'team=platform'
      })
    ).toBe('/monitors?search=checkout&status=2');

    expect(
      buildMonitorListReturnHref({
        app: 'website',
        labels: 'team=platform',
        pageIndex: '1',
        pageSize: '20',
        entityId: '42',
        entityName: 'Checkout Service'
      })
    ).toBe(
      '/monitors?app=website&labels=team%3Dplatform&pageIndex=1&pageSize=20&entityId=42&entityName=Checkout+Service'
    );

    expect(buildMonitorListReturnHref()).toBe('/monitors');
  });

  it('builds monitor list compatibility redirects with normalized query context', () => {
    expect(buildMonitorListCompatRouteUrl()).toBe('/monitors');
    expect(
      buildMonitorListCompatRouteUrl({
        app: 'website',
        labels: 'team=platform',
        entityId: '42',
        returnTo: '/entities/42?returnLabel=Checkout Service',
        returnLabel: 'Monitor list'
      })
    ).toBe('/monitors?app=website&labels=team%3Dplatform&entityId=42&returnTo=%2Fentities%2F42');
  });

  it('keeps selected monitor context when checkbox selection changes', () => {
    expect(resolveMonitorCheckboxSelection([], null, 7, true)).toEqual({
      checkedIds: [7],
      selectedId: 7
    });

    expect(resolveMonitorCheckboxSelection([7, 8], 8, 7, false)).toEqual({
      checkedIds: [8],
      selectedId: 7
    });
  });
});
