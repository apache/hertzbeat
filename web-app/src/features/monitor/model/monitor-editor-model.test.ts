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

import type { Monitor, MonitorDetail, MonitorParamDefine } from '../api/monitor-api';
import {
  buildMonitorParams, buildMonitorPayload, groupMonitorParamDefines, isValidCronExpression, monitorIntervalBounds,
  numberDefineRange,
  MonitorParamDraftError, monitorParamFormValue, monitorWritableConverged, serializeMonitorParamValue,
  createMonitorEditorDraft, transitionMonitorEditorDraft, validateMonitorDraft, validateMonitorEditorDraft
} from './monitor-editor-model';

const define = (patch: Partial<MonitorParamDefine> & Pick<MonitorParamDefine, 'field'>): MonitorParamDefine => ({
  id: null, app: 'website', name: { 'en-US': patch.field }, type: 'text', required: false,
  defaultValue: null, placeholder: null, range: null, limit: null, options: null, keyAlias: null,
  valueAlias: null, depend: null, hide: false, ...patch
});

describe('monitor editor model', () => {
  it('builds typed defaults from backend definitions', () => {
    expect(buildMonitorParams([
      define({ field: 'host', type: 'host', required: true }),
      define({ field: 'port', type: 'number', defaultValue: '8080' }),
      define({ field: 'ssl', type: 'boolean', defaultValue: 'true' })
    ])).toEqual([
      { field: 'host', type: 1, paramValue: null },
      { field: 'port', type: 0, paramValue: 8080 },
      { field: 'ssl', type: 1, paramValue: true }
    ]);
  });

  it('defaults a new boolean to false but rejects ambiguous existing null evidence', () => {
    const enabled = define({ field: 'enableSshTunnel', type: 'boolean', required: true });
    expect(buildMonitorParams([enabled])).toEqual([{ field: 'enableSshTunnel', type: 1, paramValue: false }]);
    expect(() => buildMonitorParams([enabled], [{ field: 'enableSshTunnel', type: 1, paramValue: null }]))
      .toThrow(MonitorParamDraftError);
  });

  it('round-trips backend string params through honest typed form values', () => {
    const booleanDefine = define({ field: 'ssl', type: 'boolean' });
    const numberDefine = define({ field: 'port', type: 'number' });
    expect(monitorParamFormValue(booleanDefine, 'false')).toBe(false);
    expect(monitorParamFormValue(numberDefine, '0042')).toBe(42);
    expect(() => monitorParamFormValue(numberDefine, 'not-a-number')).toThrow(MonitorParamDraftError);
    expect(serializeMonitorParamValue(booleanDefine, false)).toBe('false');
    expect(serializeMonitorParamValue(numberDefine, 42)).toBe('42');
  });

  it('normalizes an existing radio value with backend equals-ignore-case semantics', () => {
    const radio = define({ field: 'auth', type: 'radio', options: [{ label: 'Basic', value: 'basic' }] });
    expect(monitorParamFormValue(radio, 'BASIC')).toBe('basic');
    expect(() => monitorParamFormValue(radio, 'unknown')).toThrow(MonitorParamDraftError);
  });

  it('rejects corrupt optional wire values instead of silently clearing them', () => {
    expect(() => buildMonitorParams([define({ field: 'retries', type: 'number' })], [
      { field: 'retries', type: 0, paramValue: 'abc' }
    ])).toThrow(MonitorParamDraftError);
    expect(() => buildMonitorParams([define({ field: 'headers', type: 'key-value' })], [
      { field: 'headers', type: 3, paramValue: '{bad json}' }
    ])).toThrow(MonitorParamDraftError);
    expect(buildMonitorParams([define({ field: 'headers', type: 'key-value' })], [
      { field: 'headers', type: 3, paramValue: '' }
    ])[0]?.paramValue).toBe('');
    expect(serializeMonitorParamValue(define({ field: 'headers', type: 'key-value' }), '')).toBe('');
    expect(buildMonitorParams([define({ field: 'retries', type: 'number' })], [
      { field: 'retries', type: 0, paramValue: null }
    ])[0]?.paramValue).toBeNull();
  });

  it('parses key-value params but preserves the backend comma-delimited array wire format', () => {
    const keyValue = define({ field: 'headers', type: 'key-value' });
    const array = define({ field: 'targets', type: 'array' });
    expect(monitorParamFormValue(keyValue, '{"x":"1"}')).toEqual({ x: '1' });
    expect(monitorParamFormValue(array, '200, 201')).toBe('200, 201');
    expect(serializeMonitorParamValue(keyValue, { x: '1' })).toBe('{"x":"1"}');
    expect(serializeMonitorParamValue(array, '200, 201')).toBe('200, 201');
    expect(() => monitorParamFormValue(keyValue, '{"":"value"}')).toThrow(MonitorParamDraftError);
  });

  it('round-trips structured push metric fields and enforces required rows', () => {
    const metrics = define({ field: 'fields', type: 'metrics-field', required: true });
    const wire = '[{"field":"latency","unit":"ms","type":0}]';
    expect(monitorParamFormValue(metrics, wire)).toEqual([{ field: 'latency', unit: 'ms', type: 0 }]);
    expect(serializeMonitorParamValue(metrics, [{ field: 'latency', unit: 'ms', type: 0 }])).toBe(wire);
    expect(serializeMonitorParamValue(metrics, [{ field: ' latency ', unit: ' ms ', type: 0 }])).toBe(wire);
    expect(serializeMonitorParamValue(metrics, [
      { field: 'latency', unit: 'ms', type: 0 }, { field: ' latency ', unit: 's', type: 0 }
    ])).toBeNull();
    expect(() => monitorParamFormValue(metrics, '[{"field":"latency","unit":"ms","type":2}]'))
      .toThrow(MonitorParamDraftError);
    expect(() => monitorParamFormValue(metrics, '[{"field":"latency","unit":"ms","type":"number"}]'))
      .toThrow(MonitorParamDraftError);
    expect(() => monitorParamFormValue(metrics, '[{"field":"","unit":"ms","type":0}]'))
      .toThrow(MonitorParamDraftError);
    expect(() => monitorParamFormValue(metrics,
      '[{"field":"latency","unit":"ms","type":0},{"field":"latency","unit":"s","type":0}]'))
      .toThrow(MonitorParamDraftError);
    expect(validateMonitorDraft({ app: 'push', name: 'push', intervals: 60 }, [metrics], [
      { field: 'fields', type: 1, paramValue: [] }
    ])).toContain('param:fields');
  });

  it('enforces the backend number definition range without inventing a fallback', () => {
    const port = define({ field: 'port', type: 'number', required: true, range: '[0,65535]' });
    expect(numberDefineRange(port)).toEqual({ min: 0, max: 65535 });
    expect(validateMonitorDraft({ app: 'website', name: 'home', intervals: 60 }, [port], [
      { field: 'port', type: 0, paramValue: 65536 }
    ])).toContain('param:port');
    expect(() => numberDefineRange(define({ field: 'port', type: 'number', range: 'unknown' })))
      .toThrow(MonitorParamDraftError);
    const optional = define({ field: 'retries', type: 'number', range: '[0,10]' });
    expect(validateMonitorDraft({ app: 'website', name: 'home', intervals: 60 }, [optional], [
      { field: 'retries', type: 0, paramValue: 11 }
    ])).toContain('param:retries');
  });

  it('validates legacy text limits and rejects unknown definition types before rendering', () => {
    const text = define({ field: 'path', type: 'text', limit: 3 });
    expect(validateMonitorDraft({ app: 'website', name: 'home', intervals: 60 }, [text], [
      { field: 'path', type: 1, paramValue: 'long' }
    ])).toContain('param:path');
    expect(() => createMonitorEditorDraft(undefined, 'website', 'static', [
      define({ field: 'mystery', type: 'unknown' })
    ])).toThrow(MonitorParamDraftError);
  });

  it('requires an app, name, and required visible params', () => {
    expect(validateMonitorDraft({ app: '', name: '', intervals: 60 }, [], [])).toEqual(['app', 'name']);
    expect(validateMonitorDraft({ app: 'website', name: 'home', intervals: 60 }, [define({ field: 'host', required: true })],
      [{ field: 'host', paramValue: '' }])).toEqual(['param:host']);
  });

  it('validates interval and cron schedules without treating them as the same field', () => {
    expect(validateMonitorDraft({ app: 'website', name: 'home', scheduleType: 'interval', intervals: 0 }, [], []))
      .toContain('intervals');
    expect(validateMonitorDraft({ app: 'website', name: 'home', scheduleType: 'cron', cronExpression: '' }, [], []))
      .toContain('cronExpression');
    expect(isValidCronExpression('0 */5 * * * ?')).toBe(true);
    expect(isValidCronExpression('0 0 0 L * ?')).toBe(true);
    expect(isValidCronExpression('*/5 * * * *')).toBe(false);
    expect(monitorIntervalBounds('push')).toEqual({ min: 1, max: 604800, step: 1 });
    expect(monitorIntervalBounds('website')).toEqual({ min: 10, max: 604800, step: 10 });
    expect(validateMonitorDraft({ app: 'website', name: 'home', scheduleType: 'interval', intervals: 1 }, [], []))
      .toContain('intervals');
    expect(validateMonitorDraft({ app: 'push', name: 'push', scheduleType: 'interval', intervals: 1 }, [], []))
      .not.toContain('intervals');
  });

  it('requires dependent params only while their dependency is visible', () => {
    const dependent = define({ field: 'token', type: 'password', required: true, hide: true,
      depend: { auth: ['basic'] } });
    expect(groupMonitorParamDefines([define({ field: 'auth' }), dependent])).toEqual({
      basic: [define({ field: 'auth' })], advanced: [dependent]
    });
    expect(validateMonitorDraft({ app: 'website', name: 'home', intervals: 60 }, [dependent], [
      { field: 'auth', type: 1, paramValue: 'none' }, { field: 'token', type: 1, paramValue: '' }
    ])).toEqual([]);
    expect(validateMonitorDraft({ app: 'website', name: 'home', intervals: 60 }, [dependent], [
      { field: 'auth', type: 1, paramValue: 'basic' }, { field: 'token', type: 1, paramValue: '' }
    ])).toEqual(['param:token']);
    const draft = createMonitorEditorDraft(undefined, 'website', 'static', [
      define({ field: 'auth' }), dependent
    ]);
    draft.monitor.name = 'home';
    draft.invalidParamFields = ['token'];
    expect(validateMonitorEditorDraft(draft, [define({ field: 'auth' }), dependent])).not.toContain('param:token');
  });

  it('transitions service-discovery params without carrying old credentials or instance', () => {
    const main = define({ field: 'port', type: 'number', defaultValue: '80' });
    const http = { ...define({ field: 'token', type: 'password' }), app: 'http_sd' };
    const dns = { ...define({ field: 'server', type: 'text' }), app: 'dns_sd' };
    const draft = createMonitorEditorDraft(undefined, 'website', 'http_sd', [main, http]);
    draft.monitor.instance = 'old.example';
    draft.params = draft.params.map(param => param.field === 'token' ? { ...param, paramValue: 'secret' } : param);
    const next = transitionMonitorEditorDraft(draft, [main, http], [main, dns], 'dns_sd');
    expect(next.monitor).toMatchObject({ scrape: 'dns_sd', instance: 'unknow' });
    expect(next.params.find(param => param.field === 'port')?.paramValue).toBe(80);
    expect(next.params.some(param => param.field === 'token')).toBe(false);
    expect(next.params.find(param => param.field === 'server')?.paramValue).toBeNull();
    draft.monitor.id = 7;
    expect(transitionMonitorEditorDraft(draft, [main, http], [main, dns], 'dns_sd').monitor.instance).toBe('unknow');
  });

  it('serializes typed param drafts to the backend string contract', () => {
    const payload = buildMonitorPayload({ app: 'website', name: 'home', instance: '', status: 0 }, '', [
      { field: 'ssl', type: 1, paramValue: 'false' }, { field: 'port', type: 0, paramValue: '42' }
    ], [define({ field: 'ssl', type: 'boolean' }), define({ field: 'port', type: 'number' })]);
    expect(payload.params).toEqual([
      { field: 'ssl', type: 1, paramValue: 'false' }, { field: 'port', type: 0, paramValue: '42' }
    ]);
  });

  it('trims ordinary string params to the backend validation semantics', () => {
    expect(serializeMonitorParamValue(define({ field: 'token', type: 'password' }), ' secret ')).toBe('secret');
    expect(serializeMonitorParamValue(define({ field: 'codes', type: 'array' }), ' 200, 201 ')).toBe('200, 201');
    expect(serializeMonitorParamValue(define({ field: 'mode', type: 'radio' }), ' basic ')).toBe('basic');
  });

  it('normalizes missing detail schedule values to the same values displayed by the form', () => {
    const normalized = createMonitorEditorDraft({
      monitor: { id: 7, app: 'website', name: 'home', instance: 'home', status: 0,
        intervals: null, scheduleType: null }, params: [], collector: null, grafanaDashboard: null, metrics: []
    }, 'website', 'static', []);
    expect(normalized.monitor).toMatchObject({ scheduleType: 'interval', intervals: 60 });
  });

  it('builds the established monitor mutation envelope', () => {
    const payload = buildMonitorPayload({ app: 'website', name: 'home', instance: '', status: 0 }, '', [{ field: 'host', type: 1, paramValue: 'example.com' }]);
    expect(payload.monitor.instance).toBe('example.com');
    expect(payload.params).toHaveLength(1);
    expect(payload.collector).toBeNull();
    expect(payload.monitor.labels).toEqual({});
    expect(payload.monitor.annotations).toEqual({});
    expect(monitorWritableConverged('new', payload, {
      monitor: { ...payload.monitor, annotations: {} } as Monitor, collector: null, params: payload.params,
      grafanaDashboard: null, metrics: []
    })).toBe(true);
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
    const payload = buildMonitorPayload({ app: 'website', scrape: 'static', name: 'home', instance: 'ignored', status: 0 }, '', [
      { field: 'host', type: 1, paramValue: host }, { field: 'port', type: 0, paramValue: port }
    ], [define({ field: 'host', type: 'host' }), define({ field: 'port', type: 'number' })]);
    expect(payload.monitor.instance).toBe(expected);
  });

  it('uses the exact service-discovery sentinel and requires exact reread convergence', () => {
    const payload = buildMonitorPayload({ app: 'website', scrape: 'http_sd', name: 'home', instance: 'ignored',
      status: 0 }, '', [{ field: 'port', type: 0, paramValue: '443' }], [define({ field: 'port', type: 'number' })]);
    expect(payload.monitor.instance).toBe('unknow');
    const proof = { monitor: payload.monitor as Monitor, collector: null, params: payload.params,
      grafanaDashboard: payload.grafanaDashboard, metrics: [] };
    expect(monitorWritableConverged('new', payload, proof)).toBe(true);
    expect(monitorWritableConverged('new', payload, {
      ...proof, monitor: { ...proof.monitor, instance: 'unknow:443' }
    })).toBe(false);
  });

  it('preserves safe detail identity and scheduling fields in the edit payload', () => {
    const param = { id: 4, monitorId: 7, field: 'host', type: 1, paramValue: null,
      gmtCreate: 0, gmtUpdate: null };
    const dashboard = { monitorId: 7, folderUid: null, slug: 'orders', status: null, uid: 'grafana-1',
      url: null, version: 3, enabled: true, template: 'dashboard-template' };
    const payload = buildMonitorPayload({ id: 7, jobId: 9, app: 'push', scrape: 'static', name: 'orders',
      instance: 'orders', status: 1, type: 2, annotations: { team: 'platform' } }, 'collector-a', [param], [], dashboard);
    expect(payload.monitor).toMatchObject({ id: 7, jobId: 9, type: 2, annotations: { team: 'platform' } });
    expect(payload.params).toEqual([param]);
    expect(payload.grafanaDashboard).toEqual(dashboard);
  });

  it('requires authoritative reread convergence before edit or new save success', () => {
    const detail = {
      monitor: { id: 7, jobId: 9, app: 'website', name: 'home', instance: 'example.com', status: 1, type: 0,
        scrape: 'static', intervals: 60, scheduleType: 'interval', cronExpression: null,
        labels: { env: 'prod', region: 'east' }, annotations: { team: 'platform', owner: 'ops' }, description: 'homepage' },
      collector: 'collector-a', params: [{ id: 4, monitorId: 7, field: 'host', type: 1, paramValue: 'example.com' }],
      grafanaDashboard: { monitorId: 7, folderUid: null, slug: null, status: null, uid: null, url: null,
        version: null, enabled: false, template: null }, metrics: []
    } satisfies MonitorDetail;
    const payload = buildMonitorPayload(detail.monitor, 'collector-a', detail.params, [define({ field: 'host' })],
      detail.grafanaDashboard);
    expect(monitorWritableConverged('edit', payload, detail)).toBe(true);
    expect(monitorWritableConverged('edit', payload, {
      ...detail, monitor: { ...detail.monitor, labels: { region: 'east', env: 'prod' },
        annotations: { owner: 'ops', team: 'platform' } }
    })).toBe(true);
    expect(monitorWritableConverged('new', payload, {
      ...detail, monitor: { ...detail.monitor, id: 99, jobId: 101, status: 2, type: 4 }
    })).toBe(true);
    expect(monitorWritableConverged('edit', payload, {
      ...detail, monitor: { ...detail.monitor, jobId: 101, status: 2 }
    })).toBe(true);
    expect(monitorWritableConverged('edit', payload, {
      ...detail, monitor: { ...detail.monitor, intervals: 120 }
    })).toBe(false);
  });

  it('accepts only authoritative encrypted password convergence', () => {
    const password = define({ field: 'password', type: 'password' });
    const cipher = 'MDEyMzQ1Njc4OWFiY2RlZg==';
    const nextCipher = 'ZmVkY2JhOTg3NjU0MzIxMA==';
    const monitor: Monitor = { id: 7, jobId: 9, app: 'website', name: 'home', instance: '', status: 0, type: 0, labels: {}, annotations: {},
      scrape: 'static', intervals: 60, scheduleType: 'interval', cronExpression: null };
    const dashboard = { monitorId: 7, folderUid: null, slug: null, status: null, uid: null, url: null,
      version: null, enabled: false, template: null };
    const before = { monitor, collector: null, params: [{ id: 4, monitorId: 7, field: 'password', type: 1,
      paramValue: cipher }], grafanaDashboard: dashboard, metrics: [] };
    const unconfigured = buildMonitorPayload(monitor, '', [{ field: 'password', type: 1, paramValue: null }],
      [password], dashboard);
    const unconfiguredProof = { ...before, params: [{ ...before.params[0]!, paramValue: null }] };
    const unconfiguredWithoutValue = { field: 'password', type: 1,
      paramValue: undefined as unknown as null };
    expect(monitorWritableConverged('new', unconfigured, unconfiguredProof, [password])).toBe(true);
    expect(monitorWritableConverged('new', unconfigured, { ...unconfiguredProof,
      params: [unconfiguredWithoutValue] }, [password])).toBe(true);
    expect(monitorWritableConverged('new', { ...unconfigured,
      params: [unconfiguredWithoutValue] }, unconfiguredProof, [password])).toBe(true);
    const empty = buildMonitorPayload(monitor, '', [{ field: 'password', type: 1, paramValue: '' }],
      [password], dashboard);
    expect(monitorWritableConverged('new', empty, { ...unconfiguredProof,
      params: [{ field: 'password', type: 1, paramValue: '' }] }, [password])).toBe(false);
    expect(monitorWritableConverged('new', empty, { ...unconfiguredProof,
      params: [{ field: 'password', type: 1, paramValue: 'not-a-cipher' }] }, [password])).toBe(false);
    const changed = buildMonitorPayload(monitor, '', [{ ...before.params[0]!, paramValue: 'new-secret' }],
      [password], dashboard);
    const encrypted = { ...before, params: [{ ...before.params[0]!, paramValue: nextCipher }] };
    expect(monitorWritableConverged('edit', changed, encrypted, [password], before)).toBe(true);
    expect(monitorWritableConverged('edit', changed, { ...before,
      params: [{ ...before.params[0]!, paramValue: 'new-secret' }] }, [password], before)).toBe(false);
    const unchanged = buildMonitorPayload(monitor, '', before.params, [password], dashboard);
    expect(monitorWritableConverged('edit', unchanged, before, [password], before)).toBe(true);
  });
});
