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
import { formatDecimal } from '@perses-dev/components/dist/model/decimal';
it('keeps extreme finite decimal labels bounded without dropping their value', () => {
  for (const value of [Number.MAX_VALUE / 60, -Number.MAX_VALUE / 60, 1e-12]) {
    const label = formatDecimal(value, { shortValues: true });
    expect(label.length).toBeLessThan(24);
    expect(label).toMatch(/[eE]/);
    expect(label).not.toBe('0');
  }
  expect(formatDecimal(1700, { shortValues: true })).toBe('1.7K');
  expect(formatDecimal(0, { shortValues: true })).toBe('0');
});
