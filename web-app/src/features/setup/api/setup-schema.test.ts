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

import { SETUP_PHASES } from '../model/setup-contract';
import { parseSetupStatus } from './setup-schema';

describe('setup status wire contract', () => {
  it.each(SETUP_PHASES)('parses the frozen %s phase without inventing setup state', phase => {
    expect(parseSetupStatus(statusFixture({ phase })).phase).toBe(phase);
  });

  it('preserves the local and remote access boundary from the server', () => {
    expect(parseSetupStatus(statusFixture({ access: 'local' })).access).toBe('local');
    expect(parseSetupStatus(statusFixture({ access: 'locked' })).access).toBe('locked');
    expect(parseSetupStatus(statusFixture({ access: 'unlocked' })).access).toBe('unlocked');
  });

  it.each([
    ['unknown phase', { phase: 'ready' }],
    ['secret field', { password: 'must-not-parse' }],
    ['unknown warning', { pendingWarnings: ['unsafe_warning'] }],
    ['invalid observed instant', { observedAt: 'today' }]
  ])('rejects %s', (_label, override) => {
    expect(() => parseSetupStatus(statusFixture(override))).toThrowError('Setup response was invalid');
  });
});

function statusFixture(overrides: Record<string, unknown> = {}) {
  return {
    phase: 'configuration_required',
    observedAt: '2026-08-08T06:00:00Z',
    access: 'local',
    applyMode: 'managed_write',
    writableManagedConfig: true,
    operationId: null,
    errorCode: null,
    managementDatabase: {
      kind: 'h2',
      configured: false,
      source: 'built_in_default',
      restartRequired: false
    },
    telemetryStore: {
      kind: 'greptime',
      configured: false,
      source: 'built_in_default',
      restartRequired: false
    },
    administratorConfigured: false,
    optional: {
      publicBaseUrlConfigured: false,
      serverOtlpHttpConfigured: false,
      serverOtlpGrpcConfigured: false,
      retentionConfigured: false,
      mailConfigured: false
    },
    pendingWarnings: [],
    ...overrides
  };
}
