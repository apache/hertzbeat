/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  buildEntityDiscoveryCreatePath,
  defaultEntityDiscoveryQuery,
  readEntityDiscoveryCreateSource,
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

  it('carries only a bounded monitor identity into the low-friction create handoff', () => {
    const path = buildEntityDiscoveryCreatePath(
      { search: 'mysql', pageIndex: 0, pageSize: 8 },
      '/entities?type=database',
      { id: 3, name: '  primary database  ', app: 'mysql', instance: 'db:3306', status: 1 }
    );
    const url = new URL(path, 'https://hertzbeat.local');

    expect(readEntityDiscoveryCreateSource(url.searchParams)).toEqual({
      monitorId: 3,
      monitorName: 'primary database'
    });
    expect(path).not.toContain('db%3A3306');
    expect(url.searchParams.has('sourceMonitorApp')).toBe(false);
    expect(
      readEntityDiscoveryCreateSource(new URLSearchParams('sourceMonitorId=0&sourceMonitorName=private'))
    ).toBeUndefined();
  });
});
