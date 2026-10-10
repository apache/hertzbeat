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

import { canPerformNoticeRuleAction, noticeRuleActionCapabilities } from './notice-rule-action-capability';

describe('Notice rule action capability model', () => {
  it.each([
    [['ADMIN'], { canCreate: true, canEdit: true, canToggle: true, canDelete: true }],
    [['USER'], { canCreate: true, canEdit: true, canToggle: true, canDelete: false }],
    [['GUEST'], { canCreate: false, canEdit: false, canToggle: false, canDelete: false }],
    [[], { canCreate: false, canEdit: false, canToggle: false, canDelete: false }]
  ] as const)('maps roles %s to rule-specific actions', (roles, expected) => {
    expect(noticeRuleActionCapabilities(roles)).toEqual(expected);
  });

  it('admits retained retries by their exact original rule action', () => {
    const user = noticeRuleActionCapabilities(['USER']);
    expect(canPerformNoticeRuleAction(user, 'create')).toBe(true);
    expect(canPerformNoticeRuleAction(user, 'edit')).toBe(true);
    expect(canPerformNoticeRuleAction(user, 'toggle')).toBe(true);
    expect(canPerformNoticeRuleAction(user, 'delete')).toBe(false);
    expect(canPerformNoticeRuleAction(user, undefined)).toBe(false);
  });
});
