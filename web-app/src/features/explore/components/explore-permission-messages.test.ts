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

import { expect, it } from 'vitest';
import english from '@/assets/i18n/en-us.json';
type PermissionCatalog = Pick<typeof english, 'exploreSaved' | 'exploreLog'>;
const catalogs = import.meta.glob<PermissionCatalog>('../../../assets/i18n/*.json', { eager: true, import: 'default' });
it.each(Object.entries(catalogs))(
  'defines action-specific permission feedback in the runtime catalog for %s',
  (path, catalog) => {
    for (const key of ['savePermission', 'deletePermission'] as const) {
      expect(catalog.exploreSaved[key]).toBeTruthy();
      expect(catalog.exploreSaved[key]).not.toBe(catalog.exploreSaved.writeFailed);
    }
    for (const key of ['overviewPermission', 'trendPermission'] as const) {
      expect(catalog.exploreLog[key]).toBeTruthy();
      expect(catalog.exploreLog[key]).not.toBe(catalog.exploreLog.statisticsUnavailable);
    }
  }
);
