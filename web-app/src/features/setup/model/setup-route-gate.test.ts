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

import { SETUP_PHASES } from './setup-contract';
import { setupRouteDecision } from './setup-route-gate';

const paths = { setup: '/setup', login: '/passport/login' };

describe('setup route gate model', () => {
  it.each(SETUP_PHASES.filter(phase => phase !== 'complete'))('redirects product routes to setup during %s', phase => {
    expect(setupRouteDecision(phase, '/dashboard', paths)).toEqual({ kind: 'redirect', to: '/setup' });
    expect(setupRouteDecision(phase, '/setup', paths)).toEqual({ kind: 'setup' });
  });

  it('allows product routes after server-confirmed completion', () => {
    expect(setupRouteDecision('complete', '/dashboard', paths)).toEqual({ kind: 'product' });
  });

  it('sends completed setup to login and never trusts a local step', () => {
    expect(setupRouteDecision('complete', '/setup', paths)).toEqual({
      kind: 'redirect',
      to: '/passport/login'
    });
  });
});
