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

import { createNoticeTemplateDraft } from '../model/notice-template-model';
import {
  canDeleteNoticeTemplate,
  canEditNoticeTemplate,
  canRetryNoticeTemplateOperation,
  canSubmitNoticeTemplate
} from './notice-template-action-admission';
import { preset, record } from './notice-template-controller-test-fixtures';

const administrator = { canCreate: true, canEdit: true, canDelete: true };
const user = { canCreate: true, canEdit: true, canDelete: false };

describe('Notice Template action admission', () => {
  it('distinguishes create and edit from the domain draft identity', () => {
    expect(canSubmitNoticeTemplate(user, createNoticeTemplateDraft())).toBe(true);
    expect(canSubmitNoticeTemplate(user, { ...createNoticeTemplateDraft(), id: 42 })).toBe(true);
    expect(canSubmitNoticeTemplate({ ...user, canCreate: false }, createNoticeTemplateDraft())).toBe(false);
    expect(canSubmitNoticeTemplate({ ...user, canEdit: false }, { ...createNoticeTemplateDraft(), id: 42 })).toBe(
      false
    );
    expect(canSubmitNoticeTemplate(user, null)).toBe(false);
  });

  it('keeps preset records immutable even for administrators', () => {
    expect(canEditNoticeTemplate(administrator, preset)).toBe(false);
    expect(canDeleteNoticeTemplate(administrator, preset)).toBe(false);
    expect(canEditNoticeTemplate(administrator, record)).toBe(true);
    expect(canDeleteNoticeTemplate(administrator, record)).toBe(true);
  });

  it.each([
    [{ stage: 'projection', action: 'create' }, true],
    [{ stage: 'projection', action: 'edit' }, true],
    [{ stage: 'projection', action: 'delete' }, false],
    [{ stage: 'update-proof', draft: { ...createNoticeTemplateDraft(), id: 42 } }, true],
    [{ stage: 'delete-proof', id: 42, record }, false],
    [{ stage: 'commit-uncertain', draft: createNoticeTemplateDraft() }, false]
  ] as const)('admits retained recovery by its exact original action', (recovery, expected) => {
    expect(canRetryNoticeTemplateOperation(user, recovery)).toBe(expected);
  });
});
