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
  AlertInhibitContractError,
  AlertInhibitMissingError,
  buildAlertInhibitListPath,
  buildAlertInhibitPayload,
  buildAlertInhibitTogglePayload,
  createAlertInhibitDraft,
  parseAlertInhibitDetail,
  parseAlertInhibitPage,
  validateAlertInhibitDraft
} from './alert-inhibit-model';

const persisted = {
  id: 9,
  name: 'Critical suppresses warning',
  sourceLabels: { severity: 'critical', service: 'checkout' },
  targetLabels: { severity: 'warning', service: 'checkout' },
  equalLabels: ['service'],
  enable: true,
  creator: 'operator',
  modifier: null,
  gmtCreate: '2026-07-17T08:00:00',
  gmtUpdate: '2026-07-17T09:00:00'
};

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

  it('allowlists Java entity fields and preserves nullable persistence values', () => {
    expect(parseAlertInhibitDetail({ ...persisted, responseOnly: 'discard' })).toEqual(persisted);
    expect(parseAlertInhibitDetail({
      ...persisted,
      sourceLabels: null,
      targetLabels: null,
      equalLabels: null,
      enable: null,
      gmtCreate: null,
      gmtUpdate: null
    })).toMatchObject({
      sourceLabels: null, targetLabels: null, equalLabels: null, enable: null, gmtCreate: null, gmtUpdate: null
    });
  });

  it.each([
    ['unsafe id', { ...persisted, id: Number.MAX_SAFE_INTEGER + 1 }],
    ['blank name', { ...persisted, name: '  ' }],
    ['invalid source map', { ...persisted, sourceLabels: { severity: 1 } }],
    ['blank target key', { ...persisted, targetLabels: { ' ': 'warning' } }],
    ['duplicate equal label', { ...persisted, equalLabels: ['service', 'service'] }],
    ['string enablement', { ...persisted, enable: 'true' }],
    ['invalid audit time', { ...persisted, gmtUpdate: '2026-02-30T09:00:00' }]
  ])('rejects malformed %s evidence', (_label, value) => {
    expect(() => parseAlertInhibitDetail(value)).toThrow(AlertInhibitContractError);
  });

  it('binds Spring Page evidence to the request and rejects inconsistent content', () => {
    const query = { search: '', pageIndex: 1, pageSize: 15 };
    expect(parseAlertInhibitPage({
      content: [persisted], totalElements: 16, totalPages: 2, number: 1, size: 15, ignored: true
    }, query)).toEqual({ content: [persisted], totalElements: 16, totalPages: 2, number: 1, size: 15 });
    expect(() => parseAlertInhibitPage({
      content: [persisted], totalElements: 1, totalPages: 1, number: 0, size: 8
    }, query)).toThrow(AlertInhibitContractError);
    expect(() => parseAlertInhibitPage({
      content: [persisted], totalElements: 16, totalPages: 1, number: 1, size: 15
    }, query)).toThrow(AlertInhibitContractError);
    expect(() => parseAlertInhibitPage({
      content: [persisted, persisted], totalElements: 17, totalPages: 2, number: 1, size: 15
    }, query)).toThrow(AlertInhibitContractError);
  });

  it('keeps null detail missing distinct from malformed detail', () => {
    expect(() => parseAlertInhibitDetail(null)).toThrow(AlertInhibitMissingError);
    expect(() => parseAlertInhibitDetail({})).toThrow(AlertInhibitContractError);
  });

  it('allowlists toggle fields and excludes audit and response-only data', () => {
    const response = { ...persisted, responseOnly: 'discard' };
    expect(buildAlertInhibitTogglePayload(response, false)).toEqual({
      id: 9,
      name: 'Critical suppresses warning',
      sourceLabels: { severity: 'critical', service: 'checkout' },
      targetLabels: { severity: 'warning', service: 'checkout' },
      equalLabels: ['service'],
      enable: false
    });
  });
});
