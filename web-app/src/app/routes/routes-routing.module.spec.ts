import { Routes } from '@angular/router';

import { routes } from './routes-routing.module';

describe('RouteRoutingModule lazy routes', () => {
  function findChildRoute(path: string) {
    const root = (routes as Routes).find(route => route.path === '');
    return root?.children?.find(route => route.path === path);
  }

  it('should lazy load the overview dashboard route', () => {
    const route = findChildRoute('overview');

    expect(route).toBeDefined();
    expect(route?.loadChildren).toBeDefined();
    expect(route?.component).toBeUndefined();
  });

  it('should no longer register the bulletin lazy route', () => {
    const route = findChildRoute('bulletin');

    expect(route).toBeUndefined();
  });

  it('should no longer register the log lazy route', () => {
    const route = findChildRoute('log');

    expect(route).toBeUndefined();
  });

  it('should no longer register the trace lazy route', () => {
    const route = findChildRoute('trace');

    expect(route).toBeUndefined();
  });

  it('should no longer register the events redirect route', () => {
    const route = findChildRoute('events');

    expect(route).toBeUndefined();
  });

  it('should lazy load the passport route group', () => {
    const route = (routes as Routes).find(item => item.path === 'passport');

    expect(route).toBeDefined();
    expect(route?.loadChildren).toBeDefined();
    expect(route?.component).toBeUndefined();
  });

  it('should no longer register the public status route group', () => {
    const route = (routes as Routes).find(item => item.path === 'status');

    expect(route).toBeUndefined();
  });
});
