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

import { StatusOrgNotFoundError, StatusRequestFailure } from '@/features/status/shared/status-error-model';

import type { PublicStatusIncidentPage, PublicStatusOrg } from './public-status-contract';
import { PublicStatusContractError } from './public-status-contract';
import {
  isStatusOrgNotFound,
  publicComponentStateKey,
  publicIncidentStateKey,
  publicOrgStateKey,
  publicStatusState
} from './public-status-model';

describe('public status state', () => {
  it('distinguishes missing configuration from backend failure', () => {
    const notFound = new StatusOrgNotFoundError();
    expect(isStatusOrgNotFound(notFound)).toBe(true);
    expect(
      publicStatusState(evidence({ orgError: notFound, org: undefined, components: [], incidents: emptyPage }))
    ).toBe('unconfigured');
    expect(publicStatusState(evidence({ components: [], incidents: emptyPage }))).toBe('empty');
    expect(publicStatusState(evidence({ components: [{ id: 1, name: 'API', state: 'healthy', history: [] }] }))).toBe(
      'ready'
    );
    expect(publicStatusState(evidence({ orgPending: true }))).toBe('loading');
  });

  it('distinguishes transport unavailability from rejected or invalid reads', () => {
    const serviceUnavailable = new StatusRequestFailure('unavailable', 'uncertain');
    const networkFailure = new StatusRequestFailure('unavailable', 'uncertain');
    const genericEnvelopeFailure = new StatusRequestFailure('error', 'rejected');

    expect(publicStatusState(evidence({ orgError: serviceUnavailable }))).toBe('unavailable');
    expect(publicStatusState(evidence({ orgError: networkFailure }))).toBe('unavailable');
    expect(publicStatusState(evidence({ orgError: genericEnvelopeFailure }))).toBe('error');
    expect(publicStatusState(evidence({ componentsError: new Error('components failed') }))).toBe('error');
    expect(publicStatusState(evidence({ incidentsError: new Error('incidents failed') }))).toBe('error');
    expect(
      publicStatusState(
        evidence({ orgError: new StatusOrgNotFoundError(), componentsError: new Error('components unavailable') })
      )
    ).toBe('error');
    expect(publicStatusState(evidence({ orgError: new StatusRequestFailure('permission', 'rejected') }))).toBe(
      'permission'
    );
    expect(publicStatusState(evidence({ orgError: new PublicStatusContractError() }))).toBe('invalid');
  });

  it('keeps typed health and incident states distinct from unknown evidence', () => {
    expect(publicOrgStateKey('healthy')).toBe('status.operational');
    expect(publicOrgStateKey('degraded')).toBe('status.degraded');
    expect(publicOrgStateKey('incident')).toBe('status.incident');
    expect(publicOrgStateKey('unknown')).toBe('statusManagement.unknown');

    expect(publicComponentStateKey('healthy')).toBe('status.normal');
    expect(publicComponentStateKey('incident')).toBe('status.abnormal');
    expect(publicComponentStateKey('unknown')).toBe('statusManagement.unknown');

    expect(publicIncidentStateKey('investigating')).toBe('statusManagement.investigating');
    expect(publicIncidentStateKey('identified')).toBe('statusManagement.identified');
    expect(publicIncidentStateKey('monitoring')).toBe('statusManagement.monitoring');
    expect(publicIncidentStateKey('resolved')).toBe('statusManagement.resolved');
    expect(publicIncidentStateKey('unknown')).toBe('statusManagement.unknown');
  });
});

const org: PublicStatusOrg = { name: 'HertzBeat', description: 'Status', state: 'healthy' };
const emptyPage: PublicStatusIncidentPage = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };
const readyPage: PublicStatusIncidentPage = {
  content: [{ id: 1, name: 'Incident', state: 'resolved', components: [], contents: [] }],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20
};

function evidence(overrides: Partial<Parameters<typeof publicStatusState>[0]> = {}) {
  return {
    org,
    components: [],
    incidents: readyPage,
    orgError: null,
    componentsError: null,
    incidentsError: null,
    orgPending: false,
    componentsPending: false,
    incidentsPending: false,
    ...overrides
  };
}
