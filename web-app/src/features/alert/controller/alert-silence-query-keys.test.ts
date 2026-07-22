/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { AlertSilenceQuery } from '../model/alert-silence-model';
import { alertSilenceQueryKeys } from './alert-silence-query-keys';

const query: AlertSilenceQuery = { search: 'maintenance', pageIndex: 2, pageSize: 15 };

describe('Alert Silence query keys', () => {
  it('includes every backend list input in stable order', () => {
    expect(alertSilenceQueryKeys.list(query)).toEqual(['alert-silence-policies', 'list', 'maintenance', 2, 15]);
  });

  it.each([
    ['search', { search: 'deployment' }],
    ['pageIndex', { pageIndex: 3 }],
    ['pageSize', { pageSize: 25 }]
  ] satisfies Array<[string, Partial<AlertSilenceQuery>]>)(
    'separates cache evidence when %s changes',
    (_field, patch) => {
      expect(alertSilenceQueryKeys.list({ ...query, ...patch })).not.toEqual(alertSilenceQueryKeys.list(query));
    }
  );
});
