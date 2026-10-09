/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { markLogArrival, linkLogArrival, logArrival, claimLogArrival } from './log-arrival';

it('shares one arrival claim across mapping, sorting and remounts without conflating identical records', () => {
  const first = {},
    second = {},
    mapped = {};
  markLogArrival(first, 1000);
  markLogArrival(second, 1000);
  linkLogArrival(first, mapped);
  expect(logArrival(mapped)).toBe(logArrival(first));
  expect(claimLogArrival(logArrival(mapped), 1050)).toBe(50);
  expect(claimLogArrival(logArrival(first), 1051)).toBeUndefined();
  markLogArrival(first, 1052);
  expect(claimLogArrival(logArrival(first), 1053)).toBeUndefined();
  expect(claimLogArrival(logArrival(second), 1050)).toBe(50);
});

it('never flashes history or expired arrivals, including buffered pause/resume records', () => {
  const expired = {},
    future = {};
  markLogArrival(expired, 1000);
  markLogArrival(future, 2000);
  expect(claimLogArrival(logArrival({}), 1000)).toBeUndefined();
  expect(claimLogArrival(logArrival(expired), 1400)).toBeUndefined();
  expect(claimLogArrival(logArrival(future), 1000)).toBeUndefined();
  expect(claimLogArrival(logArrival(future), 2000)).toBeUndefined();
});
