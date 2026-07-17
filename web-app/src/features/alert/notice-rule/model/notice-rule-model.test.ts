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

import {
  buildNoticeRuleListPath,
  buildNoticeRulePayload,
  compatibleNoticeRuleTemplates,
  createNoticeRuleDraft,
  noticeRuleDraftFromDetail,
  readNoticeRuleQuery,
  validateNoticeRuleDependencies,
  validateNoticeRuleDraft
} from './notice-rule-model';

const receivers = [
  { id: 11, name: 'Primary email', type: 1 as const },
  { id: 12, name: 'Backup email', type: 1 as const },
  { id: 13, name: 'WebHook', type: 2 as const }
];

const templates = [
  { id: null, name: 'EmailTemplate', type: 1 as const, preset: true, content: '${content}' },
  { id: 21, name: 'Custom email', type: 1 as const, preset: false, content: '${content}' },
  { id: 22, name: 'Custom webhook', type: 2 as const, preset: false, content: '${content}' }
];

describe('notice rule model', () => {
  it('normalizes the searchable zero-based list query', () => {
    const query = readNoticeRuleQuery(new URLSearchParams('name=Night&pageIndex=2&pageSize=15'));
    expect(query).toEqual({ name: 'Night', pageIndex: 2, pageSize: 15 });
    expect(buildNoticeRuleListPath(query)).toBe('/api/notice/rules?pageIndex=2&pageSize=15&name=Night');
  });

  it('builds backend payload names from selected options and omits custom filtering when forwarding all', () => {
    const payload = buildNoticeRulePayload({
      ...createNoticeRuleDraft(),
      id: 31,
      name: '  Night on-call  ',
      receiverIds: [11, 12],
      templateId: 21,
      filterAll: true,
      labelsText: 'severity:critical',
      periodStart: '22:00',
      periodEnd: '06:00'
    }, receivers, templates);

    expect(payload).toMatchObject({
      id: 31,
      name: 'Night on-call',
      receiverId: [11, 12],
      receiverName: ['Primary email', 'Backup email'],
      templateId: 21,
      templateName: 'Custom email',
      filterAll: true,
      labels: {},
      days: [1, 2, 3, 4, 5, 6, 7]
    });
    expect(payload.periodStart).toMatch(/T22:00:00[+-]\d{2}:\d{2}$/);
    expect(payload.periodEnd).toMatch(/T06:00:00[+-]\d{2}:\d{2}$/);
  });

  it('hydrates filters, schedule, and audit-free editor state from detail', () => {
    expect(noticeRuleDraftFromDetail({
      id: 41,
      name: 'Filtered',
      receiverId: [13],
      receiverName: ['WebHook'],
      templateId: null,
      templateName: null,
      enable: false,
      filterAll: false,
      labels: { severity: 'critical' },
      days: [1, 2, 3],
      periodStart: '2026-07-13T09:30:00',
      periodEnd: '2026-07-13T18:00:00'
    })).toMatchObject({ receiverIds: [13], templateId: null, labelsText: 'severity:critical', limitDays: true, days: [1, 2, 3], periodStart: '09:30', periodEnd: '18:00' });
  });

  it('only offers custom templates compatible with one selected receiver type', () => {
    expect(compatibleNoticeRuleTemplates([11, 12], receivers, templates).map(template => template.id)).toEqual([21]);
    expect(compatibleNoticeRuleTemplates([11, 13], receivers, templates)).toEqual([]);
    expect(compatibleNoticeRuleTemplates([], receivers, templates)).toEqual([]);
  });

  it('requires receivers, valid label matchers, weekdays, and a complete time window', () => {
    const draft = createNoticeRuleDraft();
    expect(validateNoticeRuleDraft(draft)).toEqual(['name', 'receiverIds']);
    expect(validateNoticeRuleDraft({ ...draft, name: 'Filtered', receiverIds: [11], filterAll: false, labelsText: 'broken' })).toEqual(['labelsText']);
    expect(validateNoticeRuleDraft({ ...draft, name: 'Limited', receiverIds: [11], limitDays: true, days: [] })).toEqual(['days']);
    expect(validateNoticeRuleDraft({ ...draft, name: 'Timed', receiverIds: [11], periodStart: '22:00' })).toEqual(['periodEnd']);
  });

  it('rejects duplicate, stale, and template-incompatible dependency identities', () => {
    const draft = { ...createNoticeRuleDraft(), name: 'Bound', receiverIds: [11], templateId: 21 };
    expect(validateNoticeRuleDependencies(draft, receivers, templates)).toEqual([]);
    expect(validateNoticeRuleDependencies({ ...draft, receiverIds: [11, 11] }, receivers, templates))
      .toEqual(['receiverIds']);
    expect(validateNoticeRuleDependencies({ ...draft, receiverIds: [999], receiverNames: ['stale'] }, receivers, templates))
      .toEqual(['receiverIds', 'templateId']);
    expect(validateNoticeRuleDependencies({ ...draft, receiverIds: [13] }, receivers, templates))
      .toEqual(['templateId']);
    expect(validateNoticeRuleDependencies({ ...draft, templateId: 999, templateName: 'stale' }, receivers, templates))
      .toEqual(['templateId']);
  });
});
