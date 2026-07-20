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
  loginErrorMessageKey,
  loginSessionFailureMessageKey,
  resolveLoginSessionState,
  type LoginFailureKind
} from './login-model';

describe('login model', () => {
  it.each([
    ['checking', { loading: true, failure: undefined, authenticated: false }],
    ['checking', { loading: true, failure: 'unavailable', authenticated: true }],
    ['unavailable', { loading: false, failure: 'unavailable', authenticated: true }],
    ['contract', { loading: false, failure: 'contract', authenticated: true }],
    ['error', { loading: false, failure: 'error', authenticated: true }],
    ['authenticated', { loading: false, failure: undefined, authenticated: true }],
    ['anonymous', { loading: false, failure: undefined, authenticated: false }]
  ] as const)('maps session evidence to %s', (expected, evidence) => {
    expect(resolveLoginSessionState(evidence)).toBe(expected);
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['contract', 'common.routeError.description'],
    ['error', 'common.routeError.title'],
    ['anonymous', undefined]
  ] as const)('maps session state %s to its public failure key', (state, expected) => {
    expect(loginSessionFailureMessageKey(state)).toBe(expected);
  });

  it.each([
    ['invalid-credentials', 'auth.invalidCredentials'],
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ] as const)('maps the pure %s failure kind to a public message key', (failure, expected) => {
    expect(loginErrorMessageKey(failure satisfies LoginFailureKind)).toBe(expected);
  });
});
