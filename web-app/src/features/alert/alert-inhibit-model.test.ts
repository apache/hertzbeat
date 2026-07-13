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
  buildAlertInhibitListPath,
  buildAlertInhibitPayload,
  createAlertInhibitDraft,
  validateAlertInhibitDraft
} from './alert-inhibit-model';

describe('alert inhibit model', () => {
  it('builds the master pagination and search contract', () => {
    expect(buildAlertInhibitListPath({ search: '', pageIndex: 0, pageSize: 8 }))
      .toBe('/api/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(buildAlertInhibitListPath({ search: 'critical', pageIndex: 1, pageSize: 15 }))
      .toBe('/api/alert/inhibits?pageIndex=1&pageSize=15&sort=id&order=desc&search=critical');
  });

  it('parses label matchers and removes duplicate equal labels', () => {
    const draft = {
      ...createAlertInhibitDraft(),
      name: 'Critical suppresses warning',
      sourceLabelsText: 'severity:critical, service:checkout',
      targetLabelsText: 'severity:warning, service:checkout',
      equalLabels: ['service', 'service', ' instance ']
    };

    expect(buildAlertInhibitPayload(draft)).toEqual({
      name: 'Critical suppresses warning',
      sourceLabels: { severity: 'critical', service: 'checkout' },
      targetLabels: { severity: 'warning', service: 'checkout' },
      equalLabels: ['service', 'instance'],
      enable: true
    });
  });

  it('requires a name, valid source and target matchers, and an equal label', () => {
    expect(validateAlertInhibitDraft(createAlertInhibitDraft())).toEqual(['name', 'sourceLabels', 'targetLabels', 'equalLabels']);
    expect(validateAlertInhibitDraft({
      ...createAlertInhibitDraft(),
      name: 'Invalid matcher',
      sourceLabelsText: 'missing-value',
      targetLabelsText: 'severity:warning',
      equalLabels: ['service']
    })).toEqual(['sourceLabels']);
  });
});
