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

import { describe, expect, it, vi } from 'vitest';

import { bulletinActionCapabilities } from '../model/bulletin-action-capability';
import { applyBulletinCapabilityLoss, type BulletinAccessRetirement } from './bulletin-access-retirement';

describe('Bulletin capability-loss retirement', () => {
  it('retires write/delete state and selection for USER to GUEST', () => {
    const retirement = createRetirement();

    applyBulletinCapabilityLoss(
      bulletinActionCapabilities(['USER']),
      bulletinActionCapabilities(['GUEST']),
      retirement
    );

    expectRetirement(retirement, { writeDraft: 1, save: 1, delete: 1, selection: 1 });
  });

  it('preserves legal write state while retiring delete state for ADMIN to USER', () => {
    const retirement = createRetirement();

    applyBulletinCapabilityLoss(
      bulletinActionCapabilities(['ADMIN']),
      bulletinActionCapabilities(['USER']),
      retirement
    );

    expectRetirement(retirement, { writeDraft: 0, save: 0, delete: 1, selection: 1 });
  });
});

function createRetirement(): BulletinAccessRetirement {
  return {
    clearDeleteBatchSelection: vi.fn(),
    retireDelete: vi.fn(),
    retireSave: vi.fn(),
    retireWriteDraft: vi.fn()
  };
}

function expectRetirement(
  retirement: BulletinAccessRetirement,
  expected: { writeDraft: number; save: number; delete: number; selection: number }
) {
  expect(retirement.retireWriteDraft).toHaveBeenCalledTimes(expected.writeDraft);
  expect(retirement.retireSave).toHaveBeenCalledTimes(expected.save);
  expect(retirement.retireDelete).toHaveBeenCalledTimes(expected.delete);
  expect(retirement.clearDeleteBatchSelection).toHaveBeenCalledTimes(expected.selection);
}
