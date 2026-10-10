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

import { ApiMessageError } from '@/core/http/api-message';
import { shouldReconcileFailedMonitorCopy } from './monitor-copy-failure-reconciliation';

describe('shouldReconcileFailedMonitorCopy', () => {
  it.each([
    [new ApiMessageError('legacy missing source', { code: 3, status: 200 }), true],
    [new ApiMessageError('not found', { status: 404 }), true],
    [new ApiMessageError('Source monitor was not found.', { code: 2, status: 200 }), false],
    [new Error('not found'), false]
  ])('classifies Copy failure metadata without matching message text', (error, expected) => {
    expect(shouldReconcileFailedMonitorCopy('copy', error)).toBe(expected);
  });

  it('does not reconcile another command even when its error uses the legacy code', () => {
    expect(shouldReconcileFailedMonitorCopy('enable', new ApiMessageError('missing', { code: 3 }))).toBe(false);
  });
});
