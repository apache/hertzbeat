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

import { createTokenDraft, isTokenExpired, tokenScopeLabelKey, validateTokenDraft } from './token-model';

describe('token model', () => {
  it('keeps the simple form scoped without exposing a workspace field', () => {
    expect(createTokenDraft('otlp-ingest')).toEqual({ name: '', expireSeconds: -1, scope: 'otlp-ingest' });
    expect(createTokenDraft('unsupported')).toEqual({ name: '', expireSeconds: -1, scope: 'api-admin' });
  });

  it('validates the generation draft without owning endpoint serialization', () => {
    expect(validateTokenDraft(createTokenDraft())).toEqual(['name']);
    const draft = {
      ...createTokenDraft(),
      name: ' CI integration ',
      expireSeconds: 2_592_000,
      scope: 'readonly-query' as const
    };
    expect(validateTokenDraft(draft)).toEqual([]);
  });

  it('distinguishes active, expired, and non-expiring tokens', () => {
    const now = Date.parse('2026-07-16T20:00:00Z');
    expect(isTokenExpired({ expireTime: null }, now)).toBe(false);
    expect(isTokenExpired({ expireTime: '2026-07-16T19:59:00Z' }, now)).toBe(true);
    expect(isTokenExpired({ expireTime: '2026-07-16T20:01:00Z' }, now)).toBe(false);
  });

  it('does not invent a label for an unknown server scope', () => {
    expect(tokenScopeLabelKey(null)).toBeNull();
    expect(tokenScopeLabelKey(undefined)).toBeNull();
  });
});
