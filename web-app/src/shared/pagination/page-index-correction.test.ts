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
