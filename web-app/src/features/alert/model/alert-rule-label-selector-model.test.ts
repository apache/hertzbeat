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

import {
  alertRuleLabelMapFromRows,
  alertRuleLabelOptions,
  alertRuleLabelRowsFromValue
} from './alert-rule-label-selector-model';

describe('alert rule label selector model', () => {
  it('preserves complete labels and filters incomplete authoring rows', () => {
    expect(
      alertRuleLabelMapFromRows([
        { id: 1, key: 'environment', value: 'production' },
        { id: 2, key: 'team', value: '' }
      ])
    ).toEqual({ environment: 'production' });
    expect(alertRuleLabelRowsFromValue({})).toEqual([{ id: 1, key: '', value: '' }]);
  });

  it('combines canonical, selected and custom values without case-insensitive duplicates', () => {
    expect(alertRuleLabelOptions(['production', 'staging'], 'legacy', 'Preview')).toEqual([
      { label: 'Preview', value: 'Preview' }
    ]);
    expect(alertRuleLabelOptions(['production'], '', 'Production')).toEqual([
      { label: 'production', value: 'production' }
    ]);
    expect(alertRuleLabelOptions(['status-page'], '', 'custom-key')).toEqual([
      { label: 'custom-key', value: 'custom-key' }
    ]);
  });
});
