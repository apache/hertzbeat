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
import { MonitorParamDraftError } from './monitor-editor-model';
import { monitorParamFormValue, serializeMonitorParamValue } from './monitor-param-codec';

const define = (patch: Partial<MonitorParamDefine> & Pick<MonitorParamDefine, 'field'>): MonitorParamDefine => ({
  id: null, app: 'website', name: { 'en-US': patch.field }, type: 'text', required: false,
  defaultValue: null, placeholder: null, range: null, limit: null, options: null, keyAlias: null,
  valueAlias: null, depend: null, hide: false, ...patch
});

describe('Monitor parameter codec', () => {
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
    const number = define({ field: 'retries', type: 'number' });
    const map = define({ field: 'headers', type: 'key-value' });
    expect(() => monitorParamFormValue(number, 'abc')).toThrow(MonitorParamDraftError);
    expect(() => monitorParamFormValue(map, '{bad json}')).toThrow(MonitorParamDraftError);
    expect(monitorParamFormValue(map, '')).toBe('');
    expect(serializeMonitorParamValue(map, '')).toBe('');
    expect(monitorParamFormValue(number, null)).toBeNull();
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

  it('round-trips structured push metric fields and rejects unsafe rows', () => {
    const metrics = define({ field: 'fields', type: 'metrics-field', required: true });
    const wire = '[{"field":"latency","unit":"ms","type":0}]';
    expect(monitorParamFormValue(metrics, wire)).toEqual([{ field: 'latency', unit: 'ms', type: 0 }]);
    expect(serializeMonitorParamValue(metrics, [{ field: 'latency', unit: 'ms', type: 0 }])).toBe(wire);
    expect(serializeMonitorParamValue(metrics, [{ field: ' latency ', unit: ' ms ', type: 0 }])).toBe(wire);
    expect(serializeMonitorParamValue(metrics, [
      { field: 'latency', unit: 'ms', type: 0 }, { field: ' latency ', unit: 's', type: 0 }
    ])).toBeNull();
    for (const invalid of [
      '[{"field":"latency","unit":"ms","type":2}]',
      '[{"field":"latency","unit":"ms","type":"number"}]',
      '[{"field":"","unit":"ms","type":0}]',
      '[{"field":"latency","unit":"ms","type":0},{"field":"latency","unit":"s","type":0}]'
    ]) expect(() => monitorParamFormValue(metrics, invalid)).toThrow(MonitorParamDraftError);
  });

  it('trims ordinary strings to backend validation semantics', () => {
    expect(serializeMonitorParamValue(define({ field: 'token', type: 'password' }), ' secret ')).toBe('secret');
    expect(serializeMonitorParamValue(define({ field: 'codes', type: 'array' }), ' 200, 201 ')).toBe('200, 201');
    expect(serializeMonitorParamValue(define({ field: 'mode', type: 'radio' }), ' basic ')).toBe('basic');
  });
});
