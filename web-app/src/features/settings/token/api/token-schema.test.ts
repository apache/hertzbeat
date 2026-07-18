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
  parseGeneratedTokenReceipt,
  parseTokenGenerationDraft,
  parseTokenResourceRecords,
  TokenApiContractError
} from './token-schema';

describe('Token API schemas', () => {
  it('allowlists list metadata before it enters Refine state', () => {
    const [record] = parseTokenResourceRecords([{
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
    expect(JSON.stringify(record)).not.toMatch(/must-never|discard-me/);
  });

  it('keeps unknown scopes honest and rejects unsafe metadata', () => {
    expect(parseTokenResourceRecords([{ id: 8, tokenScope: 'future-scope' }])[0]?.tokenScope)
      .toBeNull();
    expect(() => parseTokenResourceRecords(null)).toThrow(TokenApiContractError);
    expect(() => parseTokenResourceRecords([{ id: 'not-a-number' }])).toThrow(TokenApiContractError);
    expect(() => parseTokenResourceRecords([{ id: 9, tokenMask: 'plaintext-token-value' }]))
      .toThrow(TokenApiContractError);
    expect(() => parseTokenResourceRecords([{ id: 10, gmtCreate: '' }]))
      .toThrow(TokenApiContractError);
    expect(() => parseTokenResourceRecords([{ id: 10, expireTime: 'not-a-date' }]))
      .toThrow(TokenApiContractError);
    expect(() => parseTokenResourceRecords([{ id: 10, lastUsedTime: Number.POSITIVE_INFINITY }]))
      .toThrow(TokenApiContractError);
  });

  it('parses one-time receipts once without changing their secret', () => {
    expect(parseGeneratedTokenReceipt({ token: '  hb-exact-secret  ' }))
      .toEqual({ id: 'generated', token: '  hb-exact-secret  ' });
    expect(() => parseGeneratedTokenReceipt({ token: '   ' })).toThrow(TokenApiContractError);
    expect(() => parseGeneratedTokenReceipt(undefined)).toThrow(TokenApiContractError);
  });

  it('validates provider variables into a domain draft', () => {
    expect(parseTokenGenerationDraft({
      name: ' Collector ',
      expireSeconds: -1,
      scope: 'otlp-ingest'
    })).toEqual({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' });
    expect(() => parseTokenGenerationDraft({ name: '', expireSeconds: -1, scope: 'otlp-ingest' }))
      .toThrow(TokenApiContractError);
  });
});
