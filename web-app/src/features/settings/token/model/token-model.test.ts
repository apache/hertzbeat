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

import {
  buildGenerateTokenPath,
  createGeneratedTokenReceipt,
  createTokenDraft,
  createTokenResourceRecords,
  isTokenExpired,
  tokenScopeLabelKey,
  TokenResourceContractError,
  validateTokenDraft
} from './token-model';

describe('token model', () => {
  it('keeps the simple form scoped without exposing a workspace field', () => {
    expect(createTokenDraft('otlp-ingest')).toEqual({ name: '', expireSeconds: -1, scope: 'otlp-ingest' });
    expect(createTokenDraft('unsupported')).toEqual({ name: '', expireSeconds: -1, scope: 'api-admin' });
  });

  it('validates and serializes the backend generation contract', () => {
    expect(validateTokenDraft(createTokenDraft())).toEqual(['name']);
    const draft = { ...createTokenDraft(), name: ' CI integration ', expireSeconds: 2_592_000, scope: 'readonly-query' as const };
    expect(validateTokenDraft(draft)).toEqual([]);
    expect(buildGenerateTokenPath(draft)).toBe('/api/account/token/generate?name=CI+integration&expireSeconds=2592000&scope=readonly-query');
  });

  it('distinguishes active, expired, and non-expiring tokens', () => {
    expect(isTokenExpired({ expireTime: null }, 2_000)).toBe(false);
    expect(isTokenExpired({ expireTime: 1_000 }, 2_000)).toBe(true);
    expect(isTokenExpired({ expireTime: 3_000 }, 2_000)).toBe(false);
  });

  it('allowlists list metadata and never retains token hashes or unknown fields', () => {
    const [record] = createTokenResourceRecords([{
      id: 7,
      name: 'Collector',
      tokenHash: 'must-never-enter-client-state',
      tokenMask: 'eyJh****once',
      tokenScope: 'otlp-ingest',
      workspaceId: 'default',
      creator: 'admin',
      gmtCreate: '2026-07-16T20:00:00',
      expireTime: null,
      lastUsedTime: 1_000,
      unknown: 'discard-me'
    }]);

    expect(record).toEqual({
      id: 7,
      name: 'Collector',
      tokenMask: 'eyJh****once',
      tokenScope: 'otlp-ingest',
      workspaceId: 'default',
      creator: 'admin',
      gmtCreate: '2026-07-16T20:00:00',
      expireTime: null,
      lastUsedTime: 1_000
    });
    expect(JSON.stringify(record)).not.toContain('must-never-enter-client-state');
    expect(JSON.stringify(record)).not.toContain('discard-me');
  });

  it('keeps unknown scopes honest and rejects malformed list evidence', () => {
    const [record] = createTokenResourceRecords([{ id: 8, tokenScope: 'future-scope' }]);

    expect(record?.tokenScope).toBeNull();
    expect(tokenScopeLabelKey(record?.tokenScope)).toBeNull();
    expect(() => createTokenResourceRecords(null)).toThrow(TokenResourceContractError);
    expect(() => createTokenResourceRecords([{ id: 'not-a-number' }])).toThrow(TokenResourceContractError);
  });

  it('rejects a noncanonical mask before plaintext can enter client state', () => {
    expect(() => createTokenResourceRecords([{ id: 9, tokenMask: 'plaintext-token-value' }]))
      .toThrow(TokenResourceContractError);
    expect(createTokenResourceRecords([{ id: 9, tokenMask: null }])[0]?.tokenMask).toBeNull();
  });

  it('rejects invalid nonnull timestamps before they enter list state', () => {
    expect(() => createTokenResourceRecords([{ id: 10, gmtCreate: '' }]))
      .toThrow(TokenResourceContractError);
    expect(() => createTokenResourceRecords([{ id: 10, expireTime: 'not-a-date' }]))
      .toThrow(TokenResourceContractError);
    expect(() => createTokenResourceRecords([{ id: 10, lastUsedTime: Number.POSITIVE_INFINITY }]))
      .toThrow(TokenResourceContractError);
  });

  it('accepts only a nonblank one-time plaintext receipt without changing it', () => {
    expect(createGeneratedTokenReceipt('  hb-exact-secret  '))
      .toEqual({ id: 'generated', token: '  hb-exact-secret  ' });
    expect(() => createGeneratedTokenReceipt('   ')).toThrow(TokenResourceContractError);
    expect(() => createGeneratedTokenReceipt(undefined)).toThrow(TokenResourceContractError);
  });
});
