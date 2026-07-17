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
  BulletinContractError,
  parseBulletinPageWire,
  parseBulletinWire,
  parseMetricsWire
} from './bulletin-schema';

describe('bulletin wire schemas', () => {
  it('normalizes absent audit metadata without weakening required fields', () => {
    expect(parseBulletinWire({
      id: 7,
      name: 'Ops',
      app: 'website',
      monitorIds: [1],
      fields: { responseTime: ['duration'] }
    })).toMatchObject({ creator: null, modifier: null, gmtCreate: null, gmtUpdate: null });

    expect(() => parseBulletinWire({ id: 7, name: 'Ops', app: 'website', monitorIds: [1] }))
      .toThrow(BulletinContractError);
  });

  it('rejects unsafe identifiers and malformed dynamic field arrays', () => {
    expect(() => parseBulletinWire({
      id: Number.MAX_SAFE_INTEGER + 1,
      name: 'Ops',
      app: 'website',
      monitorIds: [1],
      fields: {}
    })).toThrow(BulletinContractError);
    expect(() => parseBulletinWire({
      id: 7,
      name: 'Ops',
      app: 'website',
      monitorIds: [1],
      fields: { responseTime: ['duration', 42] }
    })).toThrow(BulletinContractError);
  });

  it('validates page and nested metrics structures at the boundary', () => {
    expect(() => parseBulletinPageWire({
      content: [], totalElements: 0, totalPages: 0, number: -1, size: 8
    })).toThrow(BulletinContractError);
    expect(() => parseMetricsWire({
      name: 'Ops',
      content: [{ monitorName: 'site', monitorId: 1, host: 'localhost', metrics: [{ name: 'cpu', fields: [{}] }] }]
    })).toThrow(BulletinContractError);
  });
});
