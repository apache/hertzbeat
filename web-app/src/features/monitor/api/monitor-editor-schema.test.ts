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

import { MonitorContractError } from './monitor-contract';
import {
  parseMonitorCollectorPage,
  parseMonitorParamDefines,
  requireUniqueMonitorCollectors
} from './monitor-editor-schema';

describe('Monitor editor read schemas', () => {
  it('maps the full parameter definition and binds app identity case-insensitively', () => {
    expect(parseMonitorParamDefines([{
      ...parameterDefine(),
      app: 'WebSite',
      depend: { protocol: ['https', 443, true, null] },
      options: [{ label: 'HTTPS', value: 'https', ignored: true }],
      ignored: 'wire-only'
    }], 'website')).toEqual([{
      ...parameterDefine(),
      app: 'WebSite',
      depend: { protocol: ['https', 443, true, null] },
      options: [{ label: 'HTTPS', value: 'https' }]
    }]);
  });

  it('uses the requested app only when the redundant wire identity is nullish', () => {
    const withoutApp = Object.fromEntries(
      Object.entries(parameterDefine()).filter(([key]) => key !== 'app')
    );
    expect(parseMonitorParamDefines([{ ...withoutApp, app: null }, withoutApp], 'website'))
      .toEqual([{ ...parameterDefine(), app: 'website' }, { ...parameterDefine(), app: 'website' }]);
    expect(() => parseMonitorParamDefines([{ ...parameterDefine(), app: 'other' }], 'website'))
      .toThrow(MonitorContractError);
  });

  it.each([
    [{ ...parameterDefine(), required: undefined }],
    [{ ...parameterDefine(), hide: null }],
    [{ ...parameterDefine(), defaultValue: undefined }],
    [{ ...parameterDefine(), name: null }],
    [{ ...parameterDefine(), depend: { protocol: [{}] } }],
    [{ ...parameterDefine(), type: '' }],
    null
  ])('rejects missing, null, or malformed parameter evidence %#', value => {
    expect(() => parseMonitorParamDefines(value, 'website')).toThrow(MonitorContractError);
  });

  it('maps one requested Spring collector page and strips unknown fields', () => {
    expect(parseMonitorCollectorPage({
      content: [collectorSummary('collector-a', 0), collectorSummary('collector-b', 1)],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 200,
      ignored: true
    }, 0)).toEqual({
      collectors: [{ name: 'collector-a', online: true }, { name: 'collector-b', online: false }],
      totalPages: 1
    });
  });

  it.each([
    [{ content: [], totalElements: 0, totalPages: 0, number: 1, size: 200 }, 0],
    [{ content: [], totalElements: 0, totalPages: 0, number: 0, size: 100 }, 0],
    [{ content: [], totalElements: 201, totalPages: 1, number: 0, size: 200 }, 0],
    [{ content: [collectorSummary('collector-a', 0)], totalElements: 201, totalPages: 2, number: 0, size: 200 }, 0],
    [{ content: [], totalElements: 4_001, totalPages: 21, number: 0, size: 200 }, 0],
    [{ content: [collectorSummary('collector-a', 127)], totalElements: 1, totalPages: 1, number: 0, size: 200 }, 0],
    [{ content: [collectorSummary('collector-a', 128)], totalElements: 1, totalPages: 1, number: 0, size: 200 }, 0]
  ])('rejects collector page drift, bounds, fullness, and Java-byte violations %#', (value, pageIndex) => {
    expect(() => parseMonitorCollectorPage(value, pageIndex)).toThrow(MonitorContractError);
  });

  it('requires collector names to remain globally unique across pages', () => {
    expect(() => requireUniqueMonitorCollectors([
      { name: 'collector-a', online: true },
      { name: 'collector-a', online: false }
    ])).toThrow(MonitorContractError);
  });
});

function parameterDefine() {
  return {
    id: null,
    app: 'website',
    name: { 'en-US': 'Host' },
    field: 'host',
    type: 'host',
    required: true,
    defaultValue: null,
    placeholder: null,
    range: null,
    limit: null,
    options: null,
    keyAlias: null,
    valueAlias: null,
    depend: null,
    hide: false
  };
}

function collectorSummary(name: string, status: number) {
  return { collector: { name, status, ignored: true }, ignored: true };
}
