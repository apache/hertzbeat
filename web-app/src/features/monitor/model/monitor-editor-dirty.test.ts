/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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
import { monitorEditorDraftIsDirty } from './monitor-editor-dirty';

const define = (type: string): MonitorParamDefine => ({
  id: null,
  app: 'api',
  field: 'value',
  name: { 'en-US': 'Value' },
  type,
  required: false,
  defaultValue: null,
  placeholder: null,
  range: null,
  limit: null,
  options: null,
  keyAlias: null,
  valueAlias: null,
  depend: null,
  hide: false
});

describe('monitor draft display equivalence', () => {
  it.each(['number', 'boolean', 'radio', 'key-value', 'metrics-field', 'unknown'])(
    '%s null/empty values stay strictly different',
    type => {
      const baseline = createMonitorEditorDraft(undefined, 'api', 'static', []);
      baseline.params = [{ field: 'value', type: 1, paramValue: null }];
      const changed = { ...baseline, params: [{ field: 'value', type: 1, paramValue: '' }] };
      expect(monitorEditorDraftIsDirty(changed, baseline, [define(type)])).toBe(true);
    }
  );

  it('only known text schema fields get empty equivalence', () => {
    const baseline = createMonitorEditorDraft(undefined, 'api', 'static', []);
    baseline.params = [{ field: 'unrecognized', type: 1, paramValue: null }];
    const changed = { ...baseline, params: [{ field: 'unrecognized', type: 1, paramValue: '' }] };
    expect(monitorEditorDraftIsDirty(changed, baseline, [define('text')])).toBe(true);
  });

  it('optional text description/cron/template restore their displayed empty values without mutating source', () => {
    const baseline = createMonitorEditorDraft(undefined, 'prometheus', 'static', []);
    baseline.monitor.description = null;
    const changed = {
      ...baseline,
      monitor: { ...baseline.monitor, description: '', cronExpression: '' },
      grafanaDashboard: { ...baseline.grafanaDashboard, template: '' }
    };
    const before = structuredClone({ baseline, changed });
    expect(monitorEditorDraftIsDirty(changed, baseline, [])).toBe(false);
    expect({ baseline, changed }).toEqual(before);
    expect(
      monitorEditorDraftIsDirty({ ...changed, monitor: { ...changed.monitor, description: ' ' } }, baseline, [])
    ).toBe(true);
    expect(
      monitorEditorDraftIsDirty(
        { ...changed, grafanaDashboard: { ...changed.grafanaDashboard, template: '{}' } },
        baseline,
        []
      )
    ).toBe(true);
  });

  it('metadata maps and invalid structured-field state remain meaningful changes', () => {
    const baseline = createMonitorEditorDraft(undefined, 'api', 'static', []);
    expect(monitorEditorDraftIsDirty({ ...baseline, monitor: { ...baseline.monitor, labels: {} } }, baseline, [])).toBe(
      true
    );
    expect(monitorEditorDraftIsDirty({ ...baseline, invalidParamFields: ['value'] }, baseline, [])).toBe(true);
  });
});
