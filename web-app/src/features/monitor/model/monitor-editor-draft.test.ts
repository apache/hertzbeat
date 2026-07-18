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

import type { MonitorParamDefine } from '../api/monitor-api';
import {
  buildMonitorParams,
  createMonitorEditorDraft,
  groupMonitorParamDefines,
  isMonitorParamVisible,
  transitionMonitorEditorDraft
} from './monitor-editor-draft';
import { MonitorParamDraftError } from './monitor-editor-model';

const define = (patch: Partial<MonitorParamDefine> & Pick<MonitorParamDefine, 'field'>): MonitorParamDefine => ({
  id: null, app: 'website', name: { 'en-US': patch.field }, type: 'text', required: false,
  defaultValue: null, placeholder: null, range: null, limit: null, options: null, keyAlias: null,
  valueAlias: null, depend: null, hide: false, ...patch
});

describe('Monitor editor draft', () => {
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

  it('rejects corrupt existing values and unsupported definition types before rendering', () => {
    expect(() => buildMonitorParams([define({ field: 'retries', type: 'number' })], [
      { field: 'retries', type: 0, paramValue: 'abc' }
    ])).toThrow(MonitorParamDraftError);
    expect(() => buildMonitorParams([define({ field: 'headers', type: 'key-value' })], [
      { field: 'headers', type: 3, paramValue: '{bad json}' }
    ])).toThrow(MonitorParamDraftError);
    expect(() => createMonitorEditorDraft(undefined, 'website', 'static', [
      define({ field: 'mystery', type: 'unknown' })
    ])).toThrow(MonitorParamDraftError);
  });

  it('groups definitions and evaluates scalar dependencies', () => {
    const auth = define({ field: 'auth' });
    const dependent = define({ field: 'token', type: 'password', required: true, hide: true,
      depend: { auth: ['basic'] } });
    expect(groupMonitorParamDefines([auth, dependent])).toEqual({ basic: [auth], advanced: [dependent] });
    expect(isMonitorParamVisible(dependent, [
      { field: 'auth', type: 1, paramValue: 'basic' }
    ])).toBe(true);
    expect(isMonitorParamVisible(dependent, [
      { field: 'auth', type: 1, paramValue: 'none' }
    ])).toBe(false);
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

  it('normalizes missing detail schedule values to the form defaults', () => {
    const normalized = createMonitorEditorDraft({
      monitor: { id: 7, app: 'website', name: 'home', instance: 'home', status: 0,
        intervals: null, scheduleType: null }, params: [], collector: null, grafanaDashboard: null, metrics: []
    }, 'website', 'static', []);
    expect(normalized.monitor).toMatchObject({ scheduleType: 'interval', intervals: 60 });
  });
});
