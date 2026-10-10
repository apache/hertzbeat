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

import { bulletinQueryKeys } from './bulletin-query-keys';

describe('Bulletin Query Keys', () => {
  it('identifies every list input independently', () => {
    const base = { search: 'ops', pageIndex: 0, pageSize: 8 };

    expect(bulletinQueryKeys.list(base)).not.toEqual(bulletinQueryKeys.list({ ...base, search: 'api' }));
    expect(bulletinQueryKeys.list(base)).not.toEqual(bulletinQueryKeys.list({ ...base, pageIndex: 1 }));
    expect(bulletinQueryKeys.list(base)).not.toEqual(bulletinQueryKeys.list({ ...base, pageSize: 15 }));
    expect(bulletinQueryKeys.list(base)).toEqual(['bulletin', 'lists', 'ops', 0, 8]);
  });

  it('scopes dependencies, hierarchy, and metrics by their result inputs', () => {
    expect(bulletinQueryKeys.apps('en-US')).toEqual(['bulletin', 'dependencies', 'apps', 'en-US']);
    expect(bulletinQueryKeys.apps('en-US')).not.toEqual(bulletinQueryKeys.apps('zh-CN'));
    expect(bulletinQueryKeys.monitors('website')).toEqual(['bulletin', 'dependencies', 'monitors', 'website']);
    expect(bulletinQueryKeys.hierarchy('website', 'en-US')).toEqual([
      'bulletin',
      'dependencies',
      'hierarchy',
      'website',
      'en-US'
    ]);
    expect(bulletinQueryKeys.hierarchy('website', 'en-US')).not.toEqual(
      bulletinQueryKeys.hierarchy('website', 'zh-CN')
    );
    expect(bulletinQueryKeys.hierarchy('website', 'en-US')).not.toEqual(bulletinQueryKeys.hierarchy('redis', 'en-US'));
    expect(bulletinQueryKeys.metrics(9)).toEqual(['bulletin', 'metrics', 9]);
    expect(bulletinQueryKeys.lists()).toEqual(['bulletin', 'lists']);
  });
});
