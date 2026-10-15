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
import { createMonitorEditorDraft } from './monitor-editor-draft';
import { MonitorParamDraftError } from './monitor-editor-model';
import { numberDefineRange } from './monitor-param-codec';
import {
  isValidCronExpression,
  monitorIntervalBounds,
  validateMonitorDraft,
  validateMonitorEditorDraft
} from './monitor-editor-validation';

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

describe('Monitor editor validation', () => {
  it('requires structured metric rows and required visible params', () => {
    const metrics = define({ field: 'fields', type: 'metrics-field', required: true });
    expect(
      validateMonitorDraft(
        { app: 'push', name: 'push', intervals: 60 },
        [metrics],
        [{ field: 'fields', type: 1, paramValue: [] }]
      )
    ).toContain('param:fields');
    expect(validateMonitorDraft({ app: '', name: '', intervals: 60 }, [], [])).toEqual(['app', 'name']);
    expect(
      validateMonitorDraft(
        { app: 'website', name: 'home', intervals: 60 },
        [define({ field: 'host', required: true })],
        [{ field: 'host', paramValue: '' }]
      )
    ).toEqual(['param:host']);
  });

  it('enforces number definition ranges without inventing a fallback', () => {
    const port = define({ field: 'port', type: 'number', required: true, range: '[0,65535]' });
    expect(numberDefineRange(port)).toEqual({ min: 0, max: 65535 });
    expect(
      validateMonitorDraft(
        { app: 'website', name: 'home', intervals: 60 },
        [port],
        [{ field: 'port', type: 0, paramValue: 65536 }]
      )
    ).toContain('param:port');
    expect(() => numberDefineRange(define({ field: 'port', type: 'number', range: 'unknown' }))).toThrow(
      MonitorParamDraftError
    );
    const optional = define({ field: 'retries', type: 'number', range: '[0,10]' });
    expect(
      validateMonitorDraft(
        { app: 'website', name: 'home', intervals: 60 },
        [optional],
        [{ field: 'retries', type: 0, paramValue: 11 }]
      )
    ).toContain('param:retries');
  });

  it('validates legacy text limits', () => {
    const text = define({ field: 'path', type: 'text', limit: 3 });
    expect(
      validateMonitorDraft(
        { app: 'website', name: 'home', intervals: 60 },
        [text],
        [{ field: 'path', type: 1, paramValue: 'long' }]
      )
    ).toContain('param:path');
  });

  it('validates interval and cron schedules without treating them as the same field', () => {
    expect(
      validateMonitorDraft({ app: 'website', name: 'home', scheduleType: 'interval', intervals: 0 }, [], [])
    ).toContain('intervals');
    expect(
      validateMonitorDraft({ app: 'website', name: 'home', scheduleType: 'cron', cronExpression: '' }, [], [])
    ).toContain('cronExpression');
    expect(isValidCronExpression('0 */5 * * * ?')).toBe(true);
    expect(isValidCronExpression('0 0 0 L * ?')).toBe(true);
    expect(isValidCronExpression('*/5 * * * *')).toBe(false);
    expect(monitorIntervalBounds('push')).toEqual({ min: 1, max: 604800, step: 1 });
    expect(monitorIntervalBounds('website')).toEqual({ min: 10, max: 604800, step: 10 });
    expect(
      validateMonitorDraft({ app: 'website', name: 'home', scheduleType: 'interval', intervals: 1 }, [], [])
    ).toContain('intervals');
    expect(
      validateMonitorDraft({ app: 'push', name: 'push', scheduleType: 'interval', intervals: 1 }, [], [])
    ).not.toContain('intervals');
  });

  it('requires dependent params only while their dependency is visible', () => {
    const auth = define({ field: 'auth' });
    const dependent = define({
      field: 'token',
      type: 'password',
      required: true,
      hide: true,
      depend: { auth: ['basic'] }
    });
    expect(
      validateMonitorDraft(
        { app: 'website', name: 'home', intervals: 60 },
        [dependent],
        [
          { field: 'auth', type: 1, paramValue: 'none' },
          { field: 'token', type: 1, paramValue: '' }
        ]
      )
    ).toEqual([]);
    expect(
      validateMonitorDraft(
        { app: 'website', name: 'home', intervals: 60 },
        [dependent],
        [
          { field: 'auth', type: 1, paramValue: 'basic' },
          { field: 'token', type: 1, paramValue: '' }
        ]
      )
    ).toEqual(['param:token']);
    const draft = createMonitorEditorDraft(undefined, 'website', 'static', [auth, dependent]);
    draft.monitor.name = 'home';
    draft.invalidParamFields = ['token'];
    expect(validateMonitorEditorDraft(draft, [auth, dependent])).not.toContain('param:token');
  });
});
