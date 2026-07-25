/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { authoritativePageIndexCorrection } from './page-index-correction';

describe('authoritative page index correction', () => {
  it('returns the last existing page only when the requested page is out of range', () => {
    expect(authoritativePageIndexCorrection(2, 2)).toBe(1);
    expect(authoritativePageIndexCorrection(2, 3)).toBeUndefined();
    expect(authoritativePageIndexCorrection(1, 0)).toBe(0);
    expect(authoritativePageIndexCorrection(0, 0)).toBeUndefined();
  });
});
