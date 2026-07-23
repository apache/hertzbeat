/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  defaultEntityDiscoveryQuery,
  readEntityDiscoveryQuery,
  safeEntityDiscoveryPath,
  writeEntityDiscoveryQuery
} from './entity-discovery-model';

describe('entity discovery query', () => {
  it('normalizes search and page bounds without retaining sensitive query data', () => {
    const query = readEntityDiscoveryQuery(
      new URLSearchParams({ search: `  ${'x'.repeat(240)}  `, pageIndex: '-1', pageSize: '99', token: 'private' })
    );
    expect(query).toEqual({ ...defaultEntityDiscoveryQuery, search: 'x'.repeat(200) });
    const serialized = writeEntityDiscoveryQuery(query).toString();
    expect(serialized).toContain(`search=${'x'.repeat(200)}`);
    expect(serialized).not.toContain('private');
    expect(serialized).not.toContain('token');
  });

  it('keeps valid zero-based paging and canonicalizes safe discovery return paths', () => {
    const query = readEntityDiscoveryQuery(new URLSearchParams('search=mysql&pageIndex=2&pageSize=25'));
    expect(query).toEqual({ search: 'mysql', pageIndex: 2, pageSize: 25 });
    expect(safeEntityDiscoveryPath('/entities/discovery?search=mysql&pageIndex=2&pageSize=25&token=private')).toBe(
      '/entities/discovery?pageIndex=2&pageSize=25&search=mysql'
    );
    expect(safeEntityDiscoveryPath('https://evil.example/entities/discovery')).toBe('/entities/discovery');
  });
});
