/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
