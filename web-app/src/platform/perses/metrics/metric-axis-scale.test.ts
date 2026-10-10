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
import { metricAxisScaleValid } from './metric-axis-scale';
it.each([
  [{ min: -1e308, max: 1e308 }, { min: 1, max: 4 }, false],
  [{ min: 0, max: 10 }, { min: 1, max: 4 }, true],
  [{ min: -8e307, max: 8e307 }, { min: 1, max: 4 }, true],
  [{ min: -1e308 }, { min: 1, max: 4 }, true],
  [{ max: 1e308 }, { min: -1e308, max: 4 }, false],
  [{}, { min: 1, max: 4 }, true],
  [{}, { min: -8e307, max: 8e307 }, false],
  [{ min: 0, max: 1e300 }, { min: 1e299, max: 4e299 }, true]
])('resolves installed renderer scale %j with data %j safely=%s', (bounds, extent, expected) => {
  expect(metricAxisScaleValid(bounds, extent)).toBe(expected);
});

it('uses the same partial bar bounds as the runtime, without adding a zero minimum', () => {
  expect(metricAxisScaleValid({ max: 5 }, { min: 10, max: 20 }, true)).toBe(false);
  expect(metricAxisScaleValid({ max: 25 }, { min: 10, max: 20 }, true)).toBe(true);
});
