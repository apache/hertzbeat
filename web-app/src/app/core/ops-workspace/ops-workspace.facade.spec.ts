import { TestBed } from '@angular/core/testing';

import { OpsWorkspaceFacade } from './ops-workspace.facade';

describe('OpsWorkspaceFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OpsWorkspaceFacade]
    });
  });

  it('should keep global time range, filters, entity context, and drawer state in sync', () => {
    const facade = TestBed.inject(OpsWorkspaceFacade);

    expect(facade.timeRange().presetKey).toBe('1h');

    facade.setTimePreset('24h');
    facade.patchFilters({
      environment: ['prod'],
      owner: ['platform'],
      severity: ['critical']
    });
    facade.setSelectedEntity({
      id: 'svc-checkout',
      name: 'checkout-api',
      type: 'service'
    });
    facade.openDrawer({
      kind: 'entity',
      title: 'checkout-api',
      subtitle: 'service',
      sections: [{ label: 'Owner', value: 'platform' }]
    });

    expect(facade.timeRange().presetKey).toBe('24h');
    expect(facade.filterChips().map(chip => chip.value)).toEqual(jasmine.arrayContaining(['prod', 'platform', 'critical']));
    expect(facade.selectedEntity()?.name).toBe('checkout-api');
    expect(facade.drawer()?.title).toBe('checkout-api');

    facade.closeDrawer();

    expect(facade.drawer()).toBeNull();
  });

  it('should replace query params instead of merging stale values from the previous page', () => {
    const facade = TestBed.inject(OpsWorkspaceFacade);

    facade.setQueryContext({
      route: '/log/manage',
      params: {
        traceId: 'trace-old',
        start: '1000',
        end: '2000'
      }
    });
    facade.setQueryContext({
      route: '/trace/manage',
      params: {
        entityId: '42'
      }
    });

    expect(facade.queryContext()).toEqual({
      route: '/trace/manage',
      params: {
        entityId: '42'
      }
    });
  });
});
