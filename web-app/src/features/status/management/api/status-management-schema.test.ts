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
  parseStatusComponentDetail,
  parseStatusComponents,
  parseStatusIncidentDetail,
  parseStatusIncidentPage,
  parseStatusOrg
} from './status-management-schema';
import {
  StatusManagementContractError,
  StatusManagementMissingError
} from '../model/status-management-contract';

const component = {
  id: 4,
  orgId: 2,
  name: 'API',
  description: null,
  labels: { service: 'api' },
  method: 0,
  configState: 0,
  state: 1
};

const content = {
  id: 11,
  incidentId: 7,
  message: 'Investigating',
  state: 0,
  timestamp: 200
};

const incident = {
  id: 7,
  orgId: 2,
  name: 'Outage',
  state: 0,
  startTime: 100,
  endTime: null,
  components: [component],
  contents: [content]
};

describe('Status Management wire schemas', () => {
  it('maps organization evidence through the public allowlist', () => {
    expect(parseStatusOrg({
      id: 2,
      name: 'HertzBeat',
      description: 'Status',
      home: '/',
      logo: '/logo.svg',
      feedback: null,
      color: '#5b6fd8',
      state: 0,
      creator: 'admin',
      ignored: 'server-only'
    })).toEqual({
      id: 2,
      name: 'HertzBeat',
      description: 'Status',
      home: '/',
      logo: '/logo.svg',
      feedback: null,
      color: '#5b6fd8',
      state: 0,
      creator: 'admin'
    });

    for (const value of [
      { id: 0, name: 'Org', description: 'Status', home: '/', logo: '/logo.svg', state: 0 },
      { id: 2, name: 'Org', description: 'Status', home: '/', logo: '/logo.svg', state: 3 }
    ]) {
      expect(() => parseStatusOrg(value)).toThrow(StatusManagementContractError);
    }
  });

  it('distinguishes missing details from malformed component evidence', () => {
    expect(parseStatusComponents([{ ...component, ignored: 'server-only' }])).toEqual([component]);
    expect(parseStatusComponentDetail(component)).toEqual(component);
    expect(() => parseStatusComponentDetail(null)).toThrow(StatusManagementMissingError);
    for (const value of [
      { ...component, id: -1 },
      { ...component, method: 2 },
      { ...component, state: 3 }
    ]) {
      expect(() => parseStatusComponentDetail(value)).toThrow(StatusManagementContractError);
    }
    expect(() => parseStatusComponents([component, { ...component }]))
      .toThrow(StatusManagementContractError);
  });

  it('validates nested incident records, uniqueness, and parent identity', () => {
    expect(parseStatusIncidentDetail({
      ...incident,
      ignored: 'server-only',
      components: [{ ...component, ignored: 'nested-server-only' }],
      contents: [{ ...content, ignored: 'nested-server-only' }]
    })).toEqual(incident);
    expect(() => parseStatusIncidentDetail(null)).toThrow(StatusManagementMissingError);

    for (const value of [
      { ...incident, state: 4 },
      { ...incident, components: [{ ...component, method: 9 }] },
      { ...incident, contents: [{ ...content, timestamp: 0 }] },
      { ...incident, components: [component, { ...component }] },
      { ...incident, components: [{ ...component, orgId: 3 }] },
      { ...incident, contents: [content, { ...content }] },
      { ...incident, contents: [{ ...content, incidentId: 8 }] }
    ]) {
      expect(() => parseStatusIncidentDetail(value)).toThrow(StatusManagementContractError);
    }
  });

  it('validates Spring Page identity, arithmetic, capacity, and unique ids', () => {
    const query = { search: 'outage', pageIndex: 1, pageSize: 8 };
    const page = {
      content: [incident],
      totalElements: 9,
      totalPages: 2,
      number: 1,
      size: 8
    };
    expect(parseStatusIncidentPage(page, query)).toEqual(page);

    for (const value of [
      { ...page, number: 0 },
      { ...page, size: 20 },
      { ...page, totalElements: 0 },
      { ...page, totalPages: 1 },
      { ...page, content: Array.from({ length: 9 }, (_, index) => ({ ...incident, id: 7 + index })) },
      { ...page, content: [incident, { ...incident }], totalElements: 10 }
    ]) {
      expect(() => parseStatusIncidentPage(value, query)).toThrow(StatusManagementContractError);
    }
  });

  it('does not retain rejected wire values in public errors', () => {
    const secret = 'must-not-survive-contract-error';
    let rejected: unknown;

    try {
      parseStatusOrg({
        id: secret,
        name: 'Org',
        description: 'Status',
        home: '/',
        logo: '/logo.svg',
        state: 0
      });
    } catch (error) {
      rejected = error;
    }

    expect(rejected).toBeInstanceOf(StatusManagementContractError);
    expect(JSON.stringify(rejected)).not.toContain(secret);
    expect((rejected as Error & { cause?: unknown }).cause).toBeUndefined();
  });
});
