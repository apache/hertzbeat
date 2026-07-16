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

import { buildMonitorParams, buildMonitorPayload, validateMonitorDraft } from './monitor-editor-model';

describe('monitor editor model', () => {
  it('builds typed defaults from backend definitions', () => {
    expect(buildMonitorParams([
      { field: 'host', type: 'host', required: true },
      { field: 'port', type: 'number', defaultValue: '8080' },
      { field: 'ssl', type: 'boolean', defaultValue: 'true' }
    ])).toEqual([
      { field: 'host', type: 1, paramValue: '' },
      { field: 'port', type: 0, paramValue: 8080 },
      { field: 'ssl', type: 1, paramValue: true }
    ]);
  });

  it('requires an app, name, and required visible params', () => {
    expect(validateMonitorDraft({ app: '', name: '' }, [], [])).toEqual(['app', 'name']);
    expect(validateMonitorDraft({ app: 'website', name: 'home' }, [{ field: 'host', required: true }], [{ field: 'host', paramValue: '' }])).toEqual(['param:host']);
  });

  it('builds the established monitor mutation envelope', () => {
    const payload = buildMonitorPayload({ app: 'website', name: 'home', instance: '', status: 0 }, '', [{ field: 'host', type: 1, paramValue: 'example.com' }]);
    expect(payload.monitor.instance).toBe('example.com');
    expect(payload.params).toHaveLength(1);
    expect(payload.collector).toBeNull();
  });

  it('preserves safe detail identity and scheduling fields in the edit payload', () => {
    const param = { id: 4, monitorId: 7, field: 'host', type: 1, paramValue: null,
      gmtCreate: 0, gmtUpdate: null };
    const payload = buildMonitorPayload({ id: 7, jobId: 9, app: 'push', scrape: 'push', name: 'orders',
      instance: 'orders', status: 1, type: 2, annotations: { team: 'platform' } }, 'collector-a', [param]);
    expect(payload.monitor).toMatchObject({ id: 7, jobId: 9, type: 2, annotations: { team: 'platform' } });
    expect(payload.params).toEqual([param]);
  });
});
