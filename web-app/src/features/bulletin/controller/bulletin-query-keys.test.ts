/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { bulletinQueryKeys } from './bulletin-query-keys';

describe('Bulletin Query Keys', () => {
  it('identifies every list input independently', () => {
    const base = { search: 'ops', pageIndex: 0, pageSize: 8 };

    expect(bulletinQueryKeys.list(base)).not.toEqual(bulletinQueryKeys.list({ ...base, search: 'api' }));
    expect(bulletinQueryKeys.list(base)).not.toEqual(bulletinQueryKeys.list({ ...base, pageIndex: 1 }));
    expect(bulletinQueryKeys.list(base)).not.toEqual(bulletinQueryKeys.list({ ...base, pageSize: 15 }));
    expect(bulletinQueryKeys.list(base)).toEqual(['bulletin', 'lists', 'ops', 0, 8]);
  });

  it('scopes dependencies, catalog, and metrics by their result inputs', () => {
    expect(bulletinQueryKeys.apps()).toEqual(['bulletin', 'dependencies', 'apps']);
    expect(bulletinQueryKeys.monitors('website'))
      .toEqual(['bulletin', 'dependencies', 'monitors', 'website']);
    expect(bulletinQueryKeys.catalog(7))
      .toEqual(['bulletin', 'dependencies', 'catalog', 7]);
    expect(bulletinQueryKeys.metrics(9)).toEqual(['bulletin', 'metrics', 9]);
    expect(bulletinQueryKeys.lists()).toEqual(['bulletin', 'lists']);
  });
});
