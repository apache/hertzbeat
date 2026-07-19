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

import type { Monitor, MonitorDetail, MonitorParamDefine } from './monitor-contract';
import { monitorWritableConverged } from './monitor-editor-convergence';
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
    expect(
      monitorWritableConverged('new', payload, {
        monitor: { ...payload.monitor, annotations: {} } as Monitor,
        collector: null,
        params: payload.params,
        grafanaDashboard: null,
        metrics: []
      })
    ).toBe(true);
  });

  it.each([
    ['domain with port', ' example.com ', '443', 'example.com:443'],
    ['IPv4 with port', '127.0.0.1', '8080', '127.0.0.1:8080'],
    ['existing numeric port', 'example.com:8443', '443', 'example.com:8443'],
    ['URL authority', 'https://example.com/path', '443', 'https://example.com:443/path'],
    ['URL with numeric port', 'https://example.com:8443/path', '443', 'https://example.com:8443/path'],
    ['bracketed IPv6 authority', '[::1]', '443', '[::1]:443'],
    ['bracketed IPv6 with numeric port', '[::1]:8443', '443', '[::1]:8443'],
    ['unbracketed IPv6 authority', '::1', '443', '[::1]:443'],
    ['blank port', 'example.com', ' ', 'example.com']
  ])('derives one exact static instance for %s', (_label, host, port, expected) => {
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

  it('uses the exact service-discovery sentinel and requires exact reread convergence', () => {
    const payload = buildMonitorPayload(
      { app: 'website', scrape: 'http_sd', name: 'home', instance: 'ignored', status: 0 },
      '',
      [{ field: 'port', type: 0, paramValue: '443' }],
      [define({ field: 'port', type: 'number' })]
    );
    expect(payload.monitor.instance).toBe('unknow');
    const proof = {
      monitor: payload.monitor as Monitor,
      collector: null,
      params: payload.params,
      grafanaDashboard: payload.grafanaDashboard,
      metrics: []
    };
    expect(monitorWritableConverged('new', payload, proof)).toBe(true);
    expect(
      monitorWritableConverged('new', payload, {
        ...proof,
        monitor: { ...proof.monitor, instance: 'unknow:443' }
      })
    ).toBe(false);
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

  it('requires authoritative reread convergence before edit or new save success', () => {
    const detail = {
      monitor: {
        id: 7,
        jobId: 9,
        app: 'website',
        name: 'home',
        instance: 'example.com',
        status: 1,
        type: 0,
        scrape: 'static',
        intervals: 60,
        scheduleType: 'interval',
        cronExpression: null,
        labels: { env: 'prod', region: 'east' },
        annotations: { team: 'platform', owner: 'ops' },
        description: 'homepage'
      },
      collector: 'collector-a',
      params: [{ id: 4, monitorId: 7, field: 'host', type: 1, paramValue: 'example.com' }],
      grafanaDashboard: {
        monitorId: 7,
        folderUid: null,
        slug: null,
        status: null,
        uid: null,
        url: null,
        version: null,
        enabled: false,
        template: null
      },
      metrics: []
    } satisfies MonitorDetail;
    const payload = buildMonitorPayload(
      detail.monitor,
      'collector-a',
      detail.params,
      [define({ field: 'host' })],
      detail.grafanaDashboard
    );
    expect(monitorWritableConverged('edit', payload, detail)).toBe(true);
    expect(
      monitorWritableConverged('edit', payload, {
        ...detail,
        monitor: {
          ...detail.monitor,
          labels: { region: 'east', env: 'prod' },
          annotations: { owner: 'ops', team: 'platform' }
        }
      })
    ).toBe(true);
    expect(
      monitorWritableConverged('new', payload, {
        ...detail,
        monitor: { ...detail.monitor, id: 99, jobId: 101, status: 2, type: 4 }
      })
    ).toBe(true);
    expect(
      monitorWritableConverged('edit', payload, {
        ...detail,
        monitor: { ...detail.monitor, jobId: 101, status: 2 }
      })
    ).toBe(true);
    expect(
      monitorWritableConverged('edit', payload, {
        ...detail,
        monitor: { ...detail.monitor, intervals: 120 }
      })
    ).toBe(false);
  });

  it('accepts only authoritative encrypted password convergence', () => {
    const password = define({ field: 'password', type: 'password' });
    const cipher = 'MDEyMzQ1Njc4OWFiY2RlZg==';
    const nextCipher = 'ZmVkY2JhOTg3NjU0MzIxMA==';
    const monitor: Monitor = {
      id: 7,
      jobId: 9,
      app: 'website',
      name: 'home',
      instance: '',
      status: 0,
      type: 0,
      labels: {},
      annotations: {},
      scrape: 'static',
      intervals: 60,
      scheduleType: 'interval',
      cronExpression: null
    };
    const dashboard = {
      monitorId: 7,
      folderUid: null,
      slug: null,
      status: null,
      uid: null,
      url: null,
      version: null,
      enabled: false,
      template: null
    };
    const before = {
      monitor,
      collector: null,
      params: [{ id: 4, monitorId: 7, field: 'password', type: 1, paramValue: cipher }],
      grafanaDashboard: dashboard,
      metrics: []
    };
    const unconfigured = buildMonitorPayload(
      monitor,
      '',
      [{ field: 'password', type: 1, paramValue: null }],
      [password],
      dashboard
    );
    const unconfiguredProof = { ...before, params: [{ ...before.params[0]!, paramValue: null }] };
    const unconfiguredWithoutValue = { field: 'password', type: 1, paramValue: undefined as unknown as null };
    expect(monitorWritableConverged('new', unconfigured, unconfiguredProof, [password])).toBe(true);
    expect(
      monitorWritableConverged('new', unconfigured, { ...unconfiguredProof, params: [unconfiguredWithoutValue] }, [
        password
      ])
    ).toBe(true);
    expect(
      monitorWritableConverged('new', { ...unconfigured, params: [unconfiguredWithoutValue] }, unconfiguredProof, [
        password
      ])
    ).toBe(true);
    const empty = buildMonitorPayload(
      monitor,
      '',
      [{ field: 'password', type: 1, paramValue: '' }],
      [password],
      dashboard
    );
    expect(
      monitorWritableConverged(
        'new',
        empty,
        { ...unconfiguredProof, params: [{ field: 'password', type: 1, paramValue: '' }] },
        [password]
      )
    ).toBe(false);
    expect(
      monitorWritableConverged(
        'new',
        empty,
        { ...unconfiguredProof, params: [{ field: 'password', type: 1, paramValue: 'not-a-cipher' }] },
        [password]
      )
    ).toBe(false);
    const changed = buildMonitorPayload(
      monitor,
      '',
      [{ ...before.params[0]!, paramValue: 'new-secret' }],
      [password],
      dashboard
    );
    const encrypted = { ...before, params: [{ ...before.params[0]!, paramValue: nextCipher }] };
    expect(monitorWritableConverged('edit', changed, encrypted, [password], before)).toBe(true);
    expect(
      monitorWritableConverged(
        'edit',
        changed,
        { ...before, params: [{ ...before.params[0]!, paramValue: 'new-secret' }] },
        [password],
        before
      )
    ).toBe(false);
    const unchanged = buildMonitorPayload(monitor, '', before.params, [password], dashboard);
    expect(monitorWritableConverged('edit', unchanged, before, [password], before)).toBe(true);
  });
});
