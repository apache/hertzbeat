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

import type { MonitorParamDefine } from './monitor-contract';
import { buildMonitorPayload } from './monitor-editor-payload';

const define = (patch: Partial<MonitorParamDefine> & Pick<MonitorParamDefine, 'field'>): MonitorParamDefine => ({
  id: null,
  app: 'website',
  name: { 'en-US': patch.field },
  type: 'text',
  required: false,
  defaultValue: null,
  placeholder: null,
  range: null,
  limit: null,
  options: null,
  keyAlias: null,
  valueAlias: null,
  depend: null,
  hide: false,
  ...patch
});

describe('Monitor editor payload', () => {
  it('serializes typed parameter drafts to the backend string contract', () => {
    const payload = buildMonitorPayload(
      { app: 'website', name: 'home', instance: '', status: 0 },
      '',
      [
        { field: 'ssl', type: 1, paramValue: 'false' },
        { field: 'port', type: 0, paramValue: '42' }
      ],
      [define({ field: 'ssl', type: 'boolean' }), define({ field: 'port', type: 'number' })]
    );
    expect(payload.params).toEqual([
      { field: 'ssl', type: 1, paramValue: 'false' },
      { field: 'port', type: 0, paramValue: '42' }
    ]);
  });

  it('builds the established monitor mutation envelope', () => {
    const payload = buildMonitorPayload({ app: 'website', name: 'home', instance: '', status: 0 }, '', [
      { field: 'host', type: 1, paramValue: 'example.com' }
    ]);
    expect(payload.monitor.instance).toBe('example.com');
    expect(payload.params).toHaveLength(1);
    expect(payload.collector).toBeNull();
    expect(payload.monitor.labels).toEqual({});
    expect(payload.monitor.annotations).toEqual({});
  });

  it.each([
    ['domain with port', ' example.com ', '443', 'example.com'],
    ['IPv4 with port', '127.0.0.1', '8080', '127.0.0.1'],
    ['existing numeric port', 'example.com:8443', '443', 'example.com:8443'],
    ['URL authority', 'https://example.com/path', '443', 'https://example.com/path'],
    ['URL with numeric port', 'https://example.com:8443/path', '443', 'https://example.com:8443/path'],
    ['bracketed IPv6 authority', '[::1]', '443', '[::1]'],
    ['bracketed IPv6 with numeric port', '[::1]:8443', '443', '[::1]:8443'],
    ['unbracketed IPv6 authority', '::1', '443', '::1'],
    ['blank port', 'example.com', ' ', 'example.com']
  ])('submits only the trimmed static host for %s', (_label, host, port, expected) => {
    const payload = buildMonitorPayload(
      { app: 'website', scrape: 'static', name: 'home', instance: 'ignored', status: 0 },
      '',
      [
        { field: 'host', type: 1, paramValue: host },
        { field: 'port', type: 0, paramValue: port }
      ],
      [define({ field: 'host', type: 'host' }), define({ field: 'port', type: 'number' })]
    );
    expect(payload.monitor.instance).toBe(expected);
  });

  it('leaves the static port suffix to the backend canonicalizer', () => {
    const payload = buildMonitorPayload(
      { app: 'website', scrape: 'static', name: 'home', instance: 'ignored', status: 0 },
      '',
      [
        { field: 'host', type: 1, paramValue: '127.0.0.1' },
        { field: 'port', type: 0, paramValue: '4210' }
      ],
      [define({ field: 'host', type: 'host' }), define({ field: 'port', type: 'number' })]
    );
    expect(payload.monitor.instance).toBe('127.0.0.1');
  });

  it('uses the exact service-discovery sentinel', () => {
    const payload = buildMonitorPayload(
      { app: 'website', scrape: 'http_sd', name: 'home', instance: 'ignored', status: 0 },
      '',
      [{ field: 'port', type: 0, paramValue: '443' }],
      [define({ field: 'port', type: 'number' })]
    );
    expect(payload.monitor.instance).toBe('unknow');
  });

  it('preserves safe detail identity and scheduling fields in the edit payload', () => {
    const param = { id: 4, monitorId: 7, field: 'host', type: 1, paramValue: null, gmtCreate: 0, gmtUpdate: null };
    const dashboard = {
      monitorId: 7,
      folderUid: null,
      slug: 'orders',
      status: null,
      uid: 'grafana-1',
      url: null,
      version: 3,
      enabled: true,
      template: 'dashboard-template'
    };
    const payload = buildMonitorPayload(
      {
        id: 7,
        jobId: 9,
        app: 'push',
        scrape: 'static',
        name: 'orders',
        instance: 'orders',
        status: 1,
        type: 2,
        annotations: { team: 'platform' }
      },
      'collector-a',
      [param],
      [],
      dashboard
    );
    expect(payload.monitor).toMatchObject({ id: 7, jobId: 9, type: 2, annotations: { team: 'platform' } });
    expect(payload.params).toEqual([param]);
    expect(payload.grafanaDashboard).toEqual(dashboard);
  });
});
