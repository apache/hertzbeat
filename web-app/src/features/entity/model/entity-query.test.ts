/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { readEntityQuery, writeEntityQuery } from './entity-query';

describe('entity query', () => {
  it('keeps only supported public filters and canonical paging', () => {
    const query = readEntityQuery(
      new URLSearchParams(
        'search=checkout&type=service&status=healthy&owner=sre&source=manual&environment=prod&' +
          'lifecycle=production&tier=tier1&system=commerce&sort=name&order=asc&pageIndex=2&pageSize=20&token=secret'
      )
    );

    expect(query).toEqual({
      search: 'checkout',
      type: 'service',
      status: 'healthy',
      owner: 'sre',
      source: 'manual',
      environment: 'prod',
      lifecycle: 'production',
      tier: 'tier1',
      system: 'commerce',
      sort: 'name',
      order: 'asc',
      pageIndex: 2,
      pageSize: 20
    });
    expect(writeEntityQuery(query).toString()).not.toContain('secret');
  });

  it('normalizes invalid controls and resets paging when a filter changes', () => {
    const query = readEntityQuery(new URLSearchParams('sort=private&order=sideways&pageIndex=-1&pageSize=999'));
    expect(query).toMatchObject({ sort: 'gmtUpdate', order: 'desc', pageIndex: 0, pageSize: 10 });
    expect(
      readEntityQuery(writeEntityQuery({ ...query, type: 'service', pageIndex: 4 }, { type: 'database' }))
    ).toMatchObject({
      type: 'database',
      pageIndex: 0
    });
  });
});
