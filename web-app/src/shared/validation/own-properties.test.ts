/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { hasOwnProperties } from './own-properties';

describe('own property validation', () => {
  it('accepts only objects that own every required field', () => {
    expect(hasOwnProperties({ name: 'owned', type: 1 }, ['name', 'type'])).toBe(true);
    expect(hasOwnProperties(Object.create({ name: 'inherited', type: 1 }), ['name', 'type'])).toBe(false);
    expect(hasOwnProperties([], ['length'])).toBe(false);
    expect(hasOwnProperties(null, ['name'])).toBe(false);
  });
});
