/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { changeTopologyScope, TopologyContractError, parseTopologyQuery, writeTopologyQuery } from './topology-model';

describe('topology query model', () => {
  it('parses every explicit backend input and reuses an exact complete time window', () => {
    const query = parseTopologyQuery(
      new URLSearchParams(
        'focusEntityId=10&depth=2&environment=%20prod%20&sourceKind=entity-relation&start=1000&end=2000' +
          '&relationType=depends_on&hideInternal=false&pageIndex=1&pageSize=25'
      )
    );
    expect(query).toEqual({
      focusEntityId: 10,
      depth: 2,
      environment: 'prod',
      sourceKind: 'entity-relation',
      window: { from: 1000, to: 2000 },
      relationType: 'depends_on',
      hideInternal: false,
      pageIndex: 1,
      pageSize: 25
    });
    expect(writeTopologyQuery(query).toString()).toBe(
      'focusEntityId=10&depth=2&environment=prod&sourceKind=entity-relation&start=1000&end=2000' +
        '&relationType=depends_on&hideInternal=false&pageIndex=1&pageSize=25'
    );
  });

  it('defaults depth and omits empty optional filters without inventing a window', () => {
    const query = parseTopologyQuery(new URLSearchParams('environment=%20&sourceKind=&relationType=%20'));
    expect(query).toEqual({ depth: 1 });
    expect(writeTopologyQuery(query).toString()).toBe('depth=1');
  });

  it('removes cleared optional scope fields instead of retaining undefined properties', () => {
    const query = changeTopologyScope(
      { depth: 2, focusEntityId: 10, environment: 'prod', pageIndex: 4, pageSize: 50 },
      { focusEntityId: undefined, environment: undefined }
    );
    expect(query).toEqual({ depth: 2, pageIndex: 0, pageSize: 50 });
    expect(query).not.toHaveProperty('focusEntityId');
    expect(query).not.toHaveProperty('environment');
  });

  it.each([
    'focusEntityId=0',
    'focusEntityId=9007199254740992',
    'depth=0',
    'depth=3',
    'hideInternal=yes',
    'pageIndex=-1',
    'pageIndex=2147483648',
    'pageSize=0',
    'pageSize=201',
    'start=1000',
    'end=2000',
    'start=2000&end=1000'
  ])('rejects invalid request input %s', value => {
    expect(() => parseTopologyQuery(new URLSearchParams(value))).toThrow(TopologyContractError);
  });

  it('rejects an invalid runtime boolean instead of serializing a typed escape', () => {
    const query = { depth: 1 as const, hideInternal: 'yes' as unknown as boolean };
    expect(() => writeTopologyQuery(query)).toThrow(TopologyContractError);
  });
});
