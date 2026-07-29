/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { normalizeEntityMonitorQuery } from './entity-monitor-query';

describe('entity monitor query', () => {
  it('trims filters, fixes the endpoint page size, and resets invalid paging', () => {
    expect(normalizeEntityMonitorQuery({ status: 2, app: ' website ', pageIndex: 3, pageSize: 10 })).toEqual({
      status: 2,
      app: 'website',
      pageIndex: 3,
      pageSize: 50
    });
    expect(normalizeEntityMonitorQuery({ status: -1, app: '   ', pageIndex: -1 })).toEqual({
      pageIndex: 0,
      pageSize: 50
    });
  });
});
