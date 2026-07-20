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
    expect(publicStatusState(notFound, null, null)).toBe('unconfigured');
    expect(publicStatusState(null, null, null)).toBe('ready');
  });

  it('distinguishes transport unavailability from rejected or invalid reads', () => {
    const serviceUnavailable = new StatusRequestFailure('unavailable', 'uncertain');
    const networkFailure = new StatusRequestFailure('unavailable', 'uncertain');
    const genericEnvelopeFailure = new StatusRequestFailure('error', 'rejected');

    expect(publicStatusState(serviceUnavailable, null, null)).toBe('unavailable');
    expect(publicStatusState(networkFailure, null, null)).toBe('unavailable');
    expect(publicStatusState(genericEnvelopeFailure, null, null)).toBe('error');
    expect(publicStatusState(null, new Error('components failed'), null)).toBe('error');
    expect(publicStatusState(null, null, new Error('incidents failed'))).toBe('error');
    expect(publicStatusState(new StatusOrgNotFoundError(), new Error('components unavailable'), null)).toBe('error');
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
