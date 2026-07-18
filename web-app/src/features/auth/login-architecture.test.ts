/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import page from './login-page.tsx?raw';
import styles from './login-page.module.css?raw';
import controller from './use-login-controller.ts?raw';

describe('login architecture', () => {
  it('keeps transport, cache, session, and navigation ownership out of the page', () => {
    expect(page).not.toMatch(/@tanstack\/react-query/);
    expect(page).not.toMatch(/react-router/);
    expect(page).not.toMatch(/session-api/);
    expect(page).not.toMatch(/session-context/);
    expect(page).not.toMatch(/\bfetch\s*\(/);
    expect(page).not.toContain('hertzbeat');
    expect(controller.match(/\bnavigate\s*\(/g)).toHaveLength(1);
  });

  it('uses the shared semantic surfaces instead of a route-local palette', () => {
    expect(styles).toContain('background: var(--hb-bg-canvas)');
    expect(styles).toContain('border: 1px solid var(--hb-border-subtle)');
    expect(styles).toContain('background: var(--hb-bg-raised)');
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\(/i);
  });
});
