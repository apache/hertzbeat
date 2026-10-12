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
import { parseWallTime } from './explore-time-input';
it.each([
  ['.1', 100],
  ['.12', 120],
  ['.100', 100],
  ['.001', 1],
  ['', 0]
] as const)('parses decimal seconds %s in the requested timezone', (fraction, ms) => {
  expect(parseWallTime(`2026-09-07T22:00:00${fraction}`, 'Asia/Shanghai', 1)).toBe(1788789600000 + ms);
});
it.each([
  '2026-09-07T22:00:00Z',
  '2026-09-07T22:00:00+08:00',
  '2026-09-07T22:00:00.123.junk',
  '2026-09-07T22:00:00.123.456',
  'garbage',
  ''
])('rejects non-wall-clock input %s', value => {
  expect(parseWallTime(value, 'Asia/Shanghai', 1)).toBeNaN();
});
it('preserves the exact original instant for an unchanged repeated DST wall time', () => {
  const secondOccurrence = Date.parse('2026-11-01T06:30:00Z');
  expect(parseWallTime('2026-11-01T01:30:00', 'America/New_York', secondOccurrence)).toBe(secondOccurrence);
});
