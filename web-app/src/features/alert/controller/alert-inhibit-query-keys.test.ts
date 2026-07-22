/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { alertInhibitQueryKeys } from './alert-inhibit-query-keys';

describe('Alert Inhibit query keys', () => {
  it('identifies list projections by every result-changing query field', () => {
    expect(alertInhibitQueryKeys.list({ search: 'api', pageIndex: 2, pageSize: 15 })).toEqual([
      'alert-inhibit-policies',
      'list',
      'api',
      2,
      15
    ]);
  });
});
