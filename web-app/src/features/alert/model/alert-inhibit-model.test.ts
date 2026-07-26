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
  alertInhibitFailureKind,
  alertInhibitWriteOutcome,
  buildAlertInhibitPayload,
  buildAlertInhibitTogglePayload,
  createAlertInhibitDraft,
  readAlertInhibitManagementContext,
  readAlertInhibitQuery,
  writeAlertInhibitRoute,
  writeAlertInhibitQuery,
  validateAlertInhibitDraft,
  AlertInhibitContractError,
  AlertInhibitMissingError,
  AlertInhibitRequestFailure,
  AlertInhibitUnavailableError
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
  it('normalizes and serializes the operator-owned query contract', () => {
    expect(readAlertInhibitQuery(new URLSearchParams('search=%20critical%20&pageIndex=1&pageSize=15'))).toEqual({
      search: 'critical',
      pageIndex: 1,
      pageSize: 15
    });
    expect(writeAlertInhibitQuery({ search: 'critical', pageIndex: 1, pageSize: 15 }).toString()).toBe(
      'pageIndex=1&pageSize=15&search=critical'
    );
  });

  it('keeps an entity-owned matched-rule context canonical and reloadable', () => {
    const params = new URLSearchParams(
      'entityId=7&entityName=Checkout%20API&returnTo=%2Fentities%2F7%3FreturnTo%3D%252Fentities&returnLabel=Checkout%20API&matchMode=entity-noise-controls&matchingRuleType=inhibit&matchingRuleIds=41%2Cbad%2C41%2C43'
    );

    const context = readAlertInhibitManagementContext(params);
    if (!context) throw new Error('expected entity management context');

    expect(context).toEqual({
      entityId: 7,
      entityName: 'Checkout API',
      returnTo: '/entities/7',
      returnLabel: 'Checkout API',
      mode: 'matched',
      matchingRuleIds: [41, 43]
    });
    expect(
      writeAlertInhibitRoute({ search: '', pageIndex: 0, pageSize: 8 }, { ...context, mode: 'all' }).toString()
    ).toContain('matchMode=all');
  });

  it('rejects cross-entity return targets and unrelated rule contexts', () => {
    expect(
      readAlertInhibitManagementContext(
        new URLSearchParams(
          'entityId=7&returnTo=https%3A%2F%2Fevil.example&matchMode=entity-noise-controls&matchingRuleType=inhibit&matchingRuleIds=41'
        )
      )
    ).toMatchObject({ entityId: 7, returnTo: '/entities/7', mode: 'matched' });
    expect(
      readAlertInhibitManagementContext(
        new URLSearchParams(
          'entityId=7&returnTo=%2Fentities%2F8&matchMode=entity-noise-controls&matchingRuleType=silence&matchingRuleIds=41'
        )
      )
    ).toEqual(null);
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
    expect(validateAlertInhibitDraft(createAlertInhibitDraft())).toEqual([
      'name',
      'sourceLabels',
      'targetLabels',
      'equalLabels'
    ]);
    expect(
      validateAlertInhibitDraft({
        ...createAlertInhibitDraft(),
        name: 'Invalid matcher',
        sourceLabelsText: 'missing-value',
        targetLabelsText: 'severity:warning',
        equalLabels: ['service']
      })
    ).toEqual(['sourceLabels']);
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

  it('classifies stable read failures without transport evidence', () => {
    expect(alertInhibitFailureKind(new AlertInhibitMissingError())).toBe('missing');
    expect(alertInhibitFailureKind(new AlertInhibitUnavailableError('query changed'))).toBe('unavailable');
    expect(alertInhibitFailureKind(new AlertInhibitRequestFailure('unavailable', 'uncertain'))).toBe('unavailable');
    expect(alertInhibitFailureKind(new AlertInhibitRequestFailure('error', 'uncertain'))).toBe('error');
    expect(alertInhibitFailureKind(new AlertInhibitContractError('invalid contract'))).toBe('error');
    expect(alertInhibitFailureKind(new Error('unknown failure'))).toBe('error');
  });

  it('treats only explicit HTTP rejection evidence as definite', () => {
    expect(alertInhibitWriteOutcome(new AlertInhibitRequestFailure('missing', 'rejected'))).toBe('rejected');
    expect(alertInhibitWriteOutcome(new AlertInhibitRequestFailure('error', 'uncertain'))).toBe('uncertain');
    expect(alertInhibitWriteOutcome(new AlertInhibitContractError('invalid command'))).toBe('uncertain');
    expect(alertInhibitWriteOutcome(new Error('unknown failure'))).toBe('uncertain');
  });
});
