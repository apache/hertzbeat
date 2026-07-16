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
  AlertGroupContractError,
  AlertGroupMissingError,
  buildAlertGroupListPath,
  buildAlertGroupPayload,
  buildAlertGroupTogglePayload,
  createAlertGroupDraft,
  parseAlertGroupDetail,
  parseAlertGroupPage,
  validateAlertGroupDraft
} from './alert-group-model';

const persisted = {
  id: 7,
  name: 'By service',
  groupLabels: ['service', 'severity'],
  groupWait: 30,
  groupInterval: 300,
  repeatInterval: 0,
  enable: true,
  creator: 'operator',
  modifier: null,
  gmtCreate: '2026-07-17T08:00:00',
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('alert group model', () => {
  it('builds the master pagination and search contract', () => {
    expect(buildAlertGroupListPath({ search: '', pageIndex: 0, pageSize: 8 }))
      .toBe('/api/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(buildAlertGroupListPath({ search: 'service', pageIndex: 1, pageSize: 15 }))
      .toBe('/api/alert/groups?pageIndex=1&pageSize=15&sort=id&order=desc&search=service');
  });

  it('builds an explicit group convergence payload', () => {
    const draft = { ...createAlertGroupDraft(), name: 'By service', groupLabels: ['service', 'severity'] };
    expect(buildAlertGroupPayload(draft)).toEqual({
      name: 'By service',
      groupLabels: ['service', 'severity'],
      groupWait: 30,
      groupInterval: 300,
      repeatInterval: 14400,
      enable: true
    });
  });

  it('requires a name and at least one grouping label', () => {
    expect(validateAlertGroupDraft(createAlertGroupDraft())).toEqual(['name', 'groupLabels']);
  });

  it('allowlists persisted fields and preserves nullable Java entity values', () => {
    expect(parseAlertGroupDetail({ ...persisted, internal: 'do not expose' })).toEqual(persisted);
    expect(parseAlertGroupDetail({
      ...persisted,
      groupLabels: null,
      groupWait: null,
      groupInterval: null,
      repeatInterval: null,
      enable: null,
      gmtCreate: null,
      gmtUpdate: null
    })).toMatchObject({
      groupLabels: null,
      groupWait: null,
      groupInterval: null,
      repeatInterval: null,
      enable: null,
      gmtCreate: null,
      gmtUpdate: null
    });
  });

  it.each([
    ['unsafe id', { ...persisted, id: Number.MAX_SAFE_INTEGER + 1 }],
    ['blank name', { ...persisted, name: '  ' }],
    ['duplicate grouping label', { ...persisted, groupLabels: ['service', 'service'] }],
    ['negative interval', { ...persisted, groupInterval: -1 }],
    ['string enablement', { ...persisted, enable: 'true' }],
    ['numeric audit time', { ...persisted, gmtUpdate: Date.now() }],
    ['invalid local audit time', { ...persisted, gmtUpdate: '2026-02-30T09:00:00' }]
  ])('rejects malformed %s evidence', (_label, value) => {
    expect(() => parseAlertGroupDetail(value)).toThrow(AlertGroupContractError);
  });

  it('validates exact Spring page evidence, including requested pagination and unique ids', () => {
    const query = { search: '', pageIndex: 1, pageSize: 15 };
    expect(parseAlertGroupPage({
      content: [persisted], totalElements: 16, totalPages: 2, number: 1, size: 15, ignored: true
    }, query)).toEqual({ content: [persisted], totalElements: 16, totalPages: 2, number: 1, size: 15 });

    expect(() => parseAlertGroupPage({
      content: [persisted], totalElements: 1, totalPages: 1, number: 0, size: 8
    }, query)).toThrow(AlertGroupContractError);
    expect(() => parseAlertGroupPage({
      content: [persisted], totalElements: 16, totalPages: 1, number: 1, size: 15
    }, query)).toThrow(AlertGroupContractError);
    expect(() => parseAlertGroupPage({
      content: [persisted, persisted], totalElements: 17, totalPages: 2, number: 1, size: 15
    }, query)).toThrow(AlertGroupContractError);
  });

  it('keeps missing detail distinct from malformed detail', () => {
    expect(() => parseAlertGroupDetail(null)).toThrow(AlertGroupMissingError);
    expect(() => parseAlertGroupDetail({})).toThrow(AlertGroupContractError);
  });

  it('allowlists toggle writes without audit or response-only fields', () => {
    const response = { ...persisted, responseOnly: 'ignored' };
    expect(buildAlertGroupTogglePayload(response, false)).toEqual({
      id: 7,
      name: 'By service',
      groupLabels: ['service', 'severity'],
      groupWait: 30,
      groupInterval: 300,
      repeatInterval: 0,
      enable: false
    });
  });
});
