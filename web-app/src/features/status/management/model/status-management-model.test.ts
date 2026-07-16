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
  buildIncidentPayload,
  incidentStateKey
} from './status-management-model';

describe('status page management model', () => {
  it('appends one timestamped update and keeps selected component objects', () => {
    expect(buildIncidentPayload({
      incident: {
        id: 9,
        orgId: 2,
        name: ' API outage ',
        state: 2,
        contents: [{ message: 'Investigating', state: 0, timestamp: 100 }]
      },
      componentIds: [4],
      components: [
        { id: 3, orgId: 2, name: 'Web', method: 0, configState: 0, state: 0 },
        { id: 4, orgId: 2, name: 'API', method: 0, configState: 0, state: 1 }
      ],
      message: ' Monitoring recovery ',
      timestamp: 200
    })).toEqual({
      id: 9,
      orgId: 2,
      name: 'API outage',
      state: 2,
      components: [{ id: 4, orgId: 2, name: 'API', method: 0, configState: 0, state: 1 }],
      contents: [
        { message: 'Investigating', state: 0, timestamp: 100 },
        { incidentId: 9, message: 'Monitoring recovery', state: 2, timestamp: 200 }
      ]
    });
  });

  it('rejects unsupported incident states instead of presenting them as investigating', () => {
    expect(incidentStateKey(9)).toBe('statusManagement.unknown');
    expect(() => buildIncidentPayload({
      incident: { orgId: 2, name: 'Unknown state', state: 9 },
      componentIds: [],
      components: [],
      message: 'Invalid update',
      timestamp: 200
    })).toThrow('Unsupported incident state');
  });

  it('rejects empty update messages and invalid timestamps', () => {
    const incident = { orgId: 2, name: 'API outage', state: 0 };
    expect(() => buildIncidentPayload({
      incident,
      componentIds: [],
      components: [],
      message: '   ',
      timestamp: 200
    })).toThrow('Incident update message is required');
    expect(() => buildIncidentPayload({
      incident,
      componentIds: [],
      components: [],
      message: 'Investigating',
      timestamp: Number.NaN
    })).toThrow('Incident update timestamp is invalid');
  });
});
