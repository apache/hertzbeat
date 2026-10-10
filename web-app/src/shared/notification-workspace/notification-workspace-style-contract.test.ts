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

import styles from './notification-workspace-navigation.module.css?raw';

describe('notification workspace layout contract', () => {
  it('wraps dependency guidance without clipping and keeps step rows equal height', () => {
    const stepsRule = styles.match(/\.steps\s*\{[^}]*\}/)?.[0] ?? '';
    const dependencyRule = styles.match(/\.dependency\s*\{[^}]*\}/)?.[0] ?? '';

    expect(stepsRule).toMatch(/grid-auto-rows:\s*1fr/);
    expect(dependencyRule).toMatch(/white-space:\s*normal/);
    expect(dependencyRule).toMatch(/overflow-wrap:\s*anywhere/);
    expect(dependencyRule).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(dependencyRule).not.toMatch(/overflow:\s*hidden/);
  });

  it('uses a hover surface and a line-only current-step marker', () => {
    expect(styles).toMatch(/\.steps\s+a:hover\s*\{[^}]*background:\s*var\(--hb-bg-hover\)/s);
    expect(styles).toMatch(/\.current\s+a\s*\{[^}]*border-left-color:\s*var\(--hb-brand-accent\)/s);
    expect(styles).toMatch(/\.current\s+a\s*\{[^}]*background:\s*transparent/s);
    expect(styles).not.toMatch(/\.current\s+a\s*\{[^}]*background:\s*var\(--hb-nav-selected\)/s);
  });
});
