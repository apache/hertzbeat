/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  bulletinRefreshChoices,
  bulletinRefreshInterval,
  defaultBulletinRefreshSeconds,
  isBulletinRefreshChoice
} from './bulletin-refresh-model';

describe('bulletin refresh model', () => {
  it('preserves the Angular cadence choices in controller-owned memory', () => {
    expect(defaultBulletinRefreshSeconds).toBe(30);
    expect(bulletinRefreshChoices).toEqual([10, 30, 60, 300, 0]);
    expect(bulletinRefreshInterval(10)).toBe(10_000);
    expect(bulletinRefreshInterval(0)).toBe(false);
  });

  it('admits only an explicit refresh choice', () => {
    expect(isBulletinRefreshChoice(60)).toBe(true);
    expect(isBulletinRefreshChoice(90)).toBe(false);
    expect(isBulletinRefreshChoice('30')).toBe(false);
  });
});
