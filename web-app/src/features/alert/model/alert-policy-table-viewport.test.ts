/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { alertPolicyTableViewport } from './alert-policy-table-viewport';

describe('alertPolicyTableViewport', () => {
  it('fits schema-only empty tables while preserving populated minimum widths', () => {
    expect(alertPolicyTableViewport(0, 1200)).toEqual({ mode: 'fit', scroll: { x: '100%' } });
    expect(alertPolicyTableViewport(1, 1200)).toEqual({ mode: 'scroll', scroll: { x: 1200 } });
  });
});
