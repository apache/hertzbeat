/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { entityQueryKeys } from './entity-query-keys';

describe('entity monitor query keys', () => {
  it('owns normalized filters and page identity beneath the entity detail scope', () => {
    expect(entityQueryKeys.monitors(7, { status: 2, app: ' website ', pageIndex: 1, pageSize: 50 })).toEqual([
      'entities',
      'detail',
      7,
      'monitors',
      { status: 2, app: 'website', pageIndex: 1, pageSize: 50 }
    ]);
    expect(entityQueryKeys.monitors(8, { pageIndex: 0, pageSize: 50 })).not.toEqual(
      entityQueryKeys.monitors(7, { pageIndex: 0, pageSize: 50 })
    );
  });
});
