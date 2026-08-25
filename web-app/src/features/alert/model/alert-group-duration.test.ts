/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { durationFromSeconds, durationToSeconds, preferredDurationUnit } from './alert-group-duration';

describe('Alert Group duration display contract', () => {
  it.each([
    [30, 'seconds'],
    [300, 'minutes'],
    [14_400, 'hours'],
    [61, 'seconds'],
    [0, 'seconds']
  ] as const)('chooses a lossless default unit for %s seconds', (seconds, unit) => {
    expect(preferredDurationUnit(seconds)).toBe(unit);
  });

  it('round-trips the default values without changing the seconds API contract', () => {
    expect(durationFromSeconds(30, 'seconds')).toBe(30);
    expect(durationFromSeconds(300, 'minutes')).toBe(5);
    expect(durationFromSeconds(14_400, 'hours')).toBe(4);
    expect(durationToSeconds(7, 'minutes')).toBe(420);
  });
});
