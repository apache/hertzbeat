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
  buildAlertGroupListPath,
  buildAlertGroupPayload,
  buildAlertGroupTogglePayload,
  createAlertGroupDraft,
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
