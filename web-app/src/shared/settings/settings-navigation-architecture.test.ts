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

const featureSources = import.meta.glob('../../features/**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
});

describe('settings navigation ownership', () => {
  it('keeps settings route navigation in the application shell', () => {
    const duplicateNavigationOwners = Object.entries(featureSources)
      .filter(([path]) => !path.includes('.test.'))
      .flatMap(([path, source]) => (source.includes('@/shared/settings/settings-nav') ? [path] : []));

    expect(duplicateNavigationOwners).toEqual([]);
  });
});
