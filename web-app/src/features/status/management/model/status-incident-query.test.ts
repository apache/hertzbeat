/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { describe, expect, it } from 'vitest';

import { readStatusIncidentQuery, writeStatusIncidentQuery } from './status-incident-query';

describe('status incident query model', () => {
  it('fails closed when browser parameters are completely missing', () => {
    expect(readStatusIncidentQuery(new URLSearchParams())).toEqual({ search: '', pageIndex: 0, pageSize: 8 });
  });

  it('reads the canonical search and pagination contract', () => {
    expect(readStatusIncidentQuery(new URLSearchParams('search=%20outage%20&pageIndex=2&pageSize=20'))).toEqual({
      search: 'outage',
      pageIndex: 2,
      pageSize: 20
    });
  });

  it.each(['', '+1', '-0', '-1', '1.5', '1e2', 'NaN', 'Infinity', '01', '9007199254740992'])(
    'rejects non-canonical or unsafe page indexes: %s',
    pageIndex => {
      expect(readStatusIncidentQuery(new URLSearchParams({ pageIndex })).pageIndex).toBe(0);
    }
  );

  it.each(['', '+20', '-20', '20.0', '2e1', 'NaN', 'Infinity', '08', '21', '9007199254740992'])(
    'rejects non-canonical or unsupported page sizes: %s',
    pageSize => {
      expect(readStatusIncidentQuery(new URLSearchParams({ pageSize })).pageSize).toBe(8);
    }
  );

  it('writes trimmed and canonical browser parameters', () => {
    expect(writeStatusIncidentQuery({ search: ' outage & recovery ', pageIndex: 3, pageSize: 50 }).toString()).toBe(
      'search=outage+%26+recovery&pageIndex=3&pageSize=50'
    );
    expect(writeStatusIncidentQuery({ search: ' ', pageIndex: Number.NaN, pageSize: 21 }).toString()).toBe(
      'pageIndex=0&pageSize=8'
    );
  });
});
