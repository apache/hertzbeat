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
import { dashboardCategories } from './dashboard-category';
describe('dashboard category summary', () => {
  it('aggregates applications but never invents empty categories', () => {
    expect(
      dashboardCategories({
        apps: [
          { category: 'db', app: 'mysql', size: 2, availableSize: 1, unAvailableSize: 1, unManageSize: 0 },
          { category: 'db', app: 'postgresql', size: 3, availableSize: 2, unAvailableSize: 0, unManageSize: 1 },
          { category: 'cache', app: 'redis', size: 0, availableSize: 0, unAvailableSize: 0, unManageSize: 0 }
        ]
      })
    ).toEqual([{ category: 'db', total: 5, available: 3, unavailable: 1, paused: 1 }]);
  });
  it('keeps category order and identity after an equivalent refresh', () => {
    const apps = ['service', 'db', 'cache', 'os', 'program', 'custom'].map(category => ({
      category,
      app: category,
      size: 1,
      availableSize: 1,
      unAvailableSize: 0,
      unManageSize: 0
    }));
    expect(dashboardCategories({ apps })).toEqual(dashboardCategories({ apps: apps.map(app => ({ ...app })) }));
  });
  it('omits unknown and system category evidence', () => {
    expect(
      dashboardCategories({
        apps: [{ category: null, app: 'missing', size: 1, availableSize: 1, unAvailableSize: 0, unManageSize: 0 }]
      })
    ).toEqual([]);
  });
});
