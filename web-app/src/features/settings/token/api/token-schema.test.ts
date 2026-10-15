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
  parseTokenMutationResponse,
  parseTokenResourceRecords,
  TokenApiContractError
} from './token-schema';

describe('Token API schemas', () => {
  it('parses the complete safe list summary before it enters Refine state', () => {
    const [record] = parseTokenResourceRecords([tokenSummaryWire()]);

    expect(record).toEqual({
      ...tokenSummaryWire(),
      tokenScope: 'otlp-ingest'
    });
  });

  it('keeps unknown scopes honest and rejects raw credentials, hashes, and unknown fields', () => {
    expect(
      parseTokenResourceRecords([{ ...tokenSummaryWire(), id: 8, tokenScope: 'future-scope' }])[0]?.tokenScope
    ).toBeNull();
    expect(() => parseTokenResourceRecords(null)).toThrow(TokenApiContractError);
    expect(() => parseTokenResourceRecords([{ ...tokenSummaryWire(), id: 'not-a-number' }])).toThrow(
      TokenApiContractError
    );
    for (const unsafe of [
      { token: 'raw-token' },
      { tokenHash: 'server-hash' },
      { unknown: 'discarding-is-not-validation' }
    ]) {
      expect(() => parseTokenResourceRecords([{ ...tokenSummaryWire(), ...unsafe }])).toThrow(TokenApiContractError);
    }
    expect(() => parseTokenResourceRecords([{ ...tokenSummaryWire(), tokenMask: 'plaintext-token-value' }])).toThrow(
      TokenApiContractError
    );
  });

  it('parses one-time receipts once without changing their secret', () => {
    expect(parseGeneratedTokenReceipt({ token: '  hb-exact-secret  ' })).toEqual({
      id: 'generated',
      token: '  hb-exact-secret  '
    });
    expect(() => parseGeneratedTokenReceipt({ token: '   ' })).toThrow(TokenApiContractError);
    expect(() => parseGeneratedTokenReceipt({ token: 'hb-secret', id: 7 })).toThrow(TokenApiContractError);
    expect(() => parseGeneratedTokenReceipt(undefined)).toThrow(TokenApiContractError);
  });

  it('parses only the exact id-bound revoke result statuses', () => {
    expect(parseTokenMutationResponse({ id: 7, status: 'deleted' })).toEqual({ id: 7, status: 'deleted' });
    expect(parseTokenMutationResponse({ id: 8, status: 'missing' })).toEqual({ id: 8, status: 'missing' });
    expect(parseTokenMutationResponse({ id: 9, status: 'already-revoked' })).toEqual({
      id: 9,
      status: 'already-revoked'
    });
    expect(() => parseTokenMutationResponse({ id: 7, status: 'success' })).toThrow(TokenApiContractError);
    expect(() => parseTokenMutationResponse({ id: 7, status: 'deleted', token: 'raw-token' })).toThrow(
      TokenApiContractError
    );
  });

  it('rejects legacy numeric timestamps outside the exact LocalDateTime DTO', () => {
    expect(() => parseTokenResourceRecords([{ ...tokenSummaryWire(), lastUsedTime: 1_000 }])).toThrow(
      TokenApiContractError
    );
  });

  it('validates provider variables into a domain draft', () => {
    expect(
      parseTokenGenerationDraft({
        name: ' Collector ',
        expireSeconds: -1,
        scope: 'otlp-ingest'
      })
    ).toEqual({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' });
    expect(() => parseTokenGenerationDraft({ name: '', expireSeconds: -1, scope: 'otlp-ingest' })).toThrow(
      TokenApiContractError
    );
    expect(() =>
      parseTokenGenerationDraft({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest', token: 'raw-token' })
    ).toThrow(TokenApiContractError);
    expect(() =>
      parseTokenGenerationDraft(
        Object.create({ name: 'Inherited', expireSeconds: -1, scope: 'otlp-ingest' }) as unknown
      )
    ).toThrow(TokenApiContractError);
  });
});

function tokenSummaryWire() {
  return {
    id: 7,
    name: 'Collector',
    tokenMask: 'eyJh****once',
    tokenScope: 'otlp-ingest',
    workspaceId: 'default',
    tokenAudience: 'collector-intake',
    collectorId: 'collector-a',
    allowedSignals: 'metrics,logs,traces',
    status: 1,
    creator: 'admin',
    gmtCreate: '2026-07-16T20:00:00',
    expireTime: null,
    lastUsedTime: '2026-07-16T20:01:00',
    revokedTime: null,
    revokedBy: null
  };
}
