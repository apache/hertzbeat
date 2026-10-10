/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import { noticeTemplateTime, noticeTemplateTypeLabelKey } from './notice-template-view-model';

describe('Notice Template view model', () => {
  it('selects the newest available audit time without formatting policy', () => {
    expect(noticeTemplateTime({ gmtCreate: 10, gmtUpdate: 20 })).toBe(20);
    expect(noticeTemplateTime({ gmtCreate: '2026-07-18T10:00:00', gmtUpdate: null })).toBe('2026-07-18T10:00:00');
    expect(noticeTemplateTime({ gmtCreate: null, gmtUpdate: null })).toBeNull();
  });

  it('maps channel types to the maintained receiver labels', () => {
    expect(noticeTemplateTypeLabelKey(1)).toBe('noticeReceivers.types.email');
    expect(noticeTemplateTypeLabelKey(99)).toBe('noticeReceivers.types.unknown');
  });
});
