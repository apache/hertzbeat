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

import styles from './dashboard-start.module.css?raw';

describe('Dashboard start layout contract', () => {
  it('uses the shared white workspace without a page background exception or expanded margins', () => {
    expect(styles).not.toContain('margin-inline: -4px');
    expect(styles).not.toContain('main):has');
    expect(styles).not.toContain('color-mix');
  });
  it('makes whole signal rows keyboard visible without nested card decoration', () => {
    expect(styles).toContain(':focus-visible');
    expect(styles).not.toMatch(/box-shadow/);
  });
});
