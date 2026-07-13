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

import { buildAlertListPath, readAlertQuery } from './alert-model';

describe('alert center model', () => {
  it('normalizes URL-owned filters and pagination', () => {
    const query = readAlertQuery(new URLSearchParams('search=checkout&status=FIRING&severity=critical&pageIndex=-1&pageSize=99'));

    expect(query).toEqual({ search: 'checkout', status: 'firing', severity: 'critical', pageIndex: 0, pageSize: 8 });
    expect(buildAlertListPath(query)).toBe('/api/alerts/group?pageIndex=0&pageSize=8&search=checkout&status=firing&severity=critical&sort=gmtUpdate&order=desc');
  });

  it('does not send empty filters', () => {
    expect(buildAlertListPath({ search: '', status: '', severity: '', pageIndex: 1, pageSize: 15 }))
      .toBe('/api/alerts/group?pageIndex=1&pageSize=15&sort=gmtUpdate&order=desc');
  });
});
