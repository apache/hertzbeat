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

import { canPersistNoticeRule, canPerformRetainedNoticeRuleAction } from './notice-rule-action-admission';

const administrator = { canCreate: true, canEdit: true, canToggle: true, canDelete: true };
const user = { canCreate: true, canEdit: true, canToggle: true, canDelete: false };

describe('Notice rule action admission', () => {
  it('distinguishes create from edit using the persisted draft identity', () => {
    expect(canPersistNoticeRule(administrator, {})).toBe(true);
    expect(canPersistNoticeRule(user, { id: 31 })).toBe(true);
    expect(canPersistNoticeRule({ ...user, canCreate: false }, {})).toBe(false);
    expect(canPersistNoticeRule({ ...user, canEdit: false }, { id: 31 })).toBe(false);
    expect(canPersistNoticeRule(user, null)).toBe(false);
  });

  it.each([
    ['create', true],
    ['update', true],
    ['toggle', true],
    ['delete', false]
  ] as const)('admits a retained %s receipt by its original action', (kind, expected) => {
    expect(canPerformRetainedNoticeRuleAction(user, { kind })).toBe(expected);
  });
});
