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

import { buildAlertRuleListPath, buildAlertRulePayload, createAlertRuleDraft, validateAlertRuleDraft } from './alert-rule-model';

describe('alert rule model', () => {
  it('builds the established paged search contract', () => {
    expect(buildAlertRuleListPath({ search: '', pageIndex: 0, pageSize: 8 }))
      .toBe('/api/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(buildAlertRuleListPath({ search: 'cpu', pageIndex: 2, pageSize: 15 }))
      .toBe('/api/alert/defines?pageIndex=2&pageSize=15&sort=id&order=desc&search=%255B%2522cpu%2522%255D');
  });

  it('builds a small, explicit alert payload', () => {
    const draft = { ...createAlertRuleDraft(), name: 'CPU high', expr: 'cpu_usage > 90', template: 'CPU usage is high', labelsText: 'team:ops, severity:critical' };
    expect(buildAlertRulePayload(draft)).toEqual({
      name: 'CPU high', type: 'realtime_metric', datasource: 'promql', expr: 'cpu_usage > 90',
      template: 'CPU usage is high', labels: { team: 'ops', severity: 'critical' }, annotations: {},
      enable: true, period: 300, times: 3
    });
  });

  it('requires name, expression, and message template', () => {
    expect(validateAlertRuleDraft(createAlertRuleDraft())).toEqual(['name', 'expr', 'template']);
  });
});
