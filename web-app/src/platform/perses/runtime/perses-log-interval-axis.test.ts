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
import { createTimezoneAwareAxisFormatter } from '../../../../node_modules/@perses-dev/timeseries-chart-plugin/lib/utils/timezone-formatter';
it('distinguishes subminute ticks across a thirty-minute log window while retaining whole-minute labels', () => {
  const axis = createTimezoneAwareAxisFormatter(1800000, 'UTC');
  const base = Date.UTC(2026, 8, 9, 12, 0, 0);
  expect(axis(base)).toBe('12:00');
  expect(axis(base + 5000)).toBe('12:00:05');
  expect(axis(base + 10000)).toBe('12:00:10');
  expect(axis(base + 30000)).toBe('12:00:30');
  expect(createTimezoneAwareAxisFormatter(10000, 'UTC')(base + 1000)).toBe('12:00:01.000');
  expect(createTimezoneAwareAxisFormatter(86400000 * 3, 'UTC')(base)).toBe('09.09 12:00');
});
