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

import { configurationWorkflowState } from './setup-configuration-state';

describe('setup configuration workflow state', () => {
  it.each([
    ['configuration_required', 'editing'],
    ['external_apply_required', 'external-waiting'],
    ['application_starting', 'waiting'],
    ['recovery_required', 'recovery'],
    ['migration_in_progress', 'migration']
  ] as const)('maps server phase %s to %s', (phase, expected) => {
    expect(configurationWorkflowState(phase, null)).toBe(expected);
  });

  it('prefers failed operation evidence over a generic server phase', () => {
    expect(configurationWorkflowState('application_starting', { state: 'failed' }, null)).toBe('failed');
    expect(configurationWorkflowState('recovery_required', { state: 'rolled_back' }, null)).toBe('failed');
  });

  it('distinguishes refresh re-entry from a locally acknowledged external operation', () => {
    expect(configurationWorkflowState('external_apply_required', null, null, true)).toBe('external-resume');
    expect(configurationWorkflowState('external_apply_required', null, null, false)).toBe('external-waiting');
  });

  it.each([
    ['unavailable', 'poll-unavailable'],
    ['contract', 'poll-contract'],
    ['error', 'poll-error']
  ] as const)('surfaces %s operation polling failure', (failure, expected) => {
    expect(configurationWorkflowState('application_starting', null, failure)).toBe(expected);
  });
});
