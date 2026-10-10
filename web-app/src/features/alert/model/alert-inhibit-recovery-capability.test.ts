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

import { alertInhibitRouteRecovery, canRetryAlertInhibitRecovery } from './alert-inhibit-recovery-capability';

describe('Alert Inhibit recovery capability', () => {
  it('keeps denied recovery evidence visible outside the editor without enabling retry', () => {
    const recovery = { kind: 'save', phase: 'proof', retryable: true } as const;
    expect(alertInhibitRouteRecovery(recovery, { canWrite: false, canDelete: false }, false)).toEqual({
      recovery,
      canRetry: false
    });
  });

  it('keeps authorized save recovery in the editor and permits retry', () => {
    expect(
      alertInhibitRouteRecovery(
        { kind: 'save', phase: 'proof', retryable: true },
        { canWrite: true, canDelete: false },
        true
      )
    ).toEqual({ recovery: undefined, canRetry: true });
  });

  it('keeps save recovery route-visible after a retired draft when write access returns', () => {
    const recovery = { kind: 'save', phase: 'proof', retryable: true } as const;
    expect(alertInhibitRouteRecovery(recovery, { canWrite: true, canDelete: false }, false)).toEqual({
      recovery,
      canRetry: true
    });
  });

  it('keeps write and delete recovery aligned with their distinct permissions', () => {
    expect(
      canRetryAlertInhibitRecovery(
        { kind: 'save', phase: 'proof', retryable: true },
        { canWrite: true, canDelete: false }
      )
    ).toBe(true);
    expect(
      canRetryAlertInhibitRecovery(
        { kind: 'delete', phase: 'proof', retryable: true },
        { canWrite: true, canDelete: false }
      )
    ).toBe(false);
  });
});
