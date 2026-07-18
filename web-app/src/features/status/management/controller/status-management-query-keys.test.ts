/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { statusManagementQueryKeys } from './status-management-query-keys';

describe('Status Management Query Keys', () => {
  it('keeps singleton resources stable', () => {
    expect(statusManagementQueryKeys.org()).toEqual(statusManagementQueryKeys.org());
    expect(statusManagementQueryKeys.components()).toEqual(statusManagementQueryKeys.components());
    expect(statusManagementQueryKeys.org()).not.toEqual(statusManagementQueryKeys.components());
  });

  it('includes every URL-owned incident query input', () => {
    const baseline = statusManagementQueryKeys.incidents({
      search: 'api',
      pageIndex: 0,
      pageSize: 8
    });

    expect(statusManagementQueryKeys.incidents({
      search: 'web',
      pageIndex: 0,
      pageSize: 8
    })).not.toEqual(baseline);
    expect(statusManagementQueryKeys.incidents({
      search: 'api',
      pageIndex: 1,
      pageSize: 8
    })).not.toEqual(baseline);
    expect(statusManagementQueryKeys.incidents({
      search: 'api',
      pageIndex: 0,
      pageSize: 20
    })).not.toEqual(baseline);
  });
});
