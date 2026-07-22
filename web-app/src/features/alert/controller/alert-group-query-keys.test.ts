/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { AlertGroupQuery } from '../model/alert-group-model';
import { alertGroupQueryKeys } from './alert-group-query-keys';

const query: AlertGroupQuery = { search: 'service', pageIndex: 2, pageSize: 15 };

describe('Alert Group Query Keys', () => {
  it('includes every backend list input in stable order', () => {
    expect(alertGroupQueryKeys.list(query)).toEqual(['alert-group-policies', 'list', 'service', 2, 15]);
  });

  it.each([
    ['search', { search: 'host' }],
    ['pageIndex', { pageIndex: 3 }],
    ['pageSize', { pageSize: 25 }]
  ] satisfies Array<[string, Partial<AlertGroupQuery>]>)(
    'separates cache evidence when %s changes',
    (_field, patch) => {
      expect(alertGroupQueryKeys.list({ ...query, ...patch })).not.toEqual(alertGroupQueryKeys.list(query));
    }
  );
});
