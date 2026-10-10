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
