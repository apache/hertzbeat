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
import { batchFixture } from './agent-batch-fixture';
import { batchActionKey, batchSessionStatus } from './agent-batch-presentation';
describe('batch presentation uses current authoritative progress', () => {
  it('distinguishes preflight retry from remaining-budget continuation', () => {
    const batch = batchFixture();
    batch.actionReason = 'PREFLIGHT_FAILED';
    expect(batchActionKey(batch)).toBe('retryPreflight');
    batch.stage = 'RUNNING';
    expect(batchActionKey(batch)).toBe('reconnect');
    batch.stage = 'PAUSED';
    batch.nextAction = 'RECONCILE';
    expect(batchActionKey(batch)).toBe('reconcile');
  });
  it('shows partial only for the matching selected terminal failed run and preserves uncertain outcomes', () => {
    const batch = batchFixture();
    expect(batchSessionStatus('FAILED', 'root', batch)).toBe('PARTIAL');
    expect(batchSessionStatus('FAILED', 'another-run', batch)).toBe('FAILED');
    expect(batchSessionStatus('CANCELLED', 'root', batch)).toBe('CANCELLED');
    batch.reviewRequired = 1;
    expect(batchSessionStatus('FAILED', 'root', batch)).toBe('RECOVERY_REQUIRED');
  });
  it('never labels uncertain outcomes as a preflight retry even with stale action metadata', () => {
    const batch = batchFixture();
    batch.stage = 'REVIEW_REQUIRED';
    batch.reviewRequired = 9;
    batch.actionReason = 'PREFLIGHT_FAILED';
    batch.nextAction = 'RECONCILE';
    expect(batchActionKey(batch)).toBe('reconcile');
  });
});
