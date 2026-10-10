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

import { persistSystemPreferences, readRuntimeLocale, readRuntimeTheme } from './runtime-preferences';

describe('runtime preferences', () => {
  it('uses stable dark defaults and persists only supported values', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    };
    expect(readRuntimeTheme(storage)).toBe('dark');
    expect(readRuntimeLocale(storage)).toBeNull();
    persistSystemPreferences({ locale: 'pt_BR', theme: 'compact' }, storage);
    expect(readRuntimeLocale(storage)).toBe('pt-BR');
    expect(readRuntimeTheme(storage)).toBe('compact');
  });

  it('treats unavailable browser storage as a non-fatal preference miss', () => {
    const blockedStorage = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      }
    };

    expect(readRuntimeLocale(blockedStorage)).toBeNull();
    expect(readRuntimeTheme(blockedStorage)).toBe('dark');
    expect(() => persistSystemPreferences({ locale: 'en_US', theme: 'compact' }, blockedStorage)).not.toThrow();
  });
});
