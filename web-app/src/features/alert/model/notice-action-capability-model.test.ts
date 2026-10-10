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

import { canPerformNoticeAction, noticeActionCapabilities } from './notice-action-capability-model';

describe('Notice action capability model', () => {
  it.each([
    [['ADMIN'], { canCreate: true, canEdit: true, canTest: true, canDelete: true }],
    [['USER'], { canCreate: true, canEdit: true, canTest: true, canDelete: false }],
    [['GUEST'], { canCreate: false, canEdit: false, canTest: false, canDelete: false }],
    [[], { canCreate: false, canEdit: false, canTest: false, canDelete: false }]
  ] as const)('matches the shipped Notice action policy for roles %s', (roles, expected) => {
    expect(noticeActionCapabilities(roles)).toEqual(expected);
  });

  it('admits retained retries according to their operation kind', () => {
    const user = noticeActionCapabilities(['USER']);
    expect(canPerformNoticeAction(user, 'create')).toBe(true);
    expect(canPerformNoticeAction(user, 'edit')).toBe(true);
    expect(canPerformNoticeAction(user, 'test')).toBe(true);
    expect(canPerformNoticeAction(user, 'delete')).toBe(false);
    expect(canPerformNoticeAction(user, undefined)).toBe(false);
  });
});
