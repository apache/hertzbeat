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

import { buildMonitorAppPickerGroups, filterMonitorAppPickerGroups } from './monitor-app-picker-model';

describe('monitor app picker model', () => {
  const groups = buildMonitorAppPickerGroups([
    { category: 'service', value: 'website', label: 'Website' },
    { category: 'db', value: 'mysql', label: 'MySQL' },
    { category: 'db', value: 'postgresql', label: 'PostgreSQL', hide: true },
    { category: '__system__', value: 'internal', label: 'Internal' },
    { category: null, value: 'missing-category', label: 'Missing category' }
  ]);

  it('keeps backend order and groups every creatable app except system entries', () => {
    expect(groups).toEqual([
      {
        category: 'service',
        apps: [{ value: 'website', label: 'Website' }]
      },
      {
        category: 'db',
        apps: [
          { value: 'mysql', label: 'MySQL' },
          { value: 'postgresql', label: 'PostgreSQL' }
        ]
      }
    ]);
  });

  it('filters by localized label or stable application id without mutating the catalog', () => {
    expect(filterMonitorAppPickerGroups(groups, 'post')).toEqual([
      {
        category: 'db',
        apps: [{ value: 'postgresql', label: 'PostgreSQL' }]
      }
    ]);
    expect(filterMonitorAppPickerGroups(groups, 'website')).toEqual([
      {
        category: 'service',
        apps: [{ value: 'website', label: 'Website' }]
      }
    ]);
    expect(groups[1]?.apps).toHaveLength(2);
  });
});
