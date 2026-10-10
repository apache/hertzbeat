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

import { readStatusIncidentQuery, writeStatusIncidentQuery } from './status-incident-query';

describe('status incident query model', () => {
  it('fails closed when browser parameters are completely missing', () => {
    expect(readStatusIncidentQuery(new URLSearchParams())).toEqual({ search: '', pageIndex: 0, pageSize: 8 });
  });

  it('reads the canonical search and pagination contract', () => {
    expect(readStatusIncidentQuery(new URLSearchParams('search=%20outage%20&pageIndex=2&pageSize=20'))).toEqual({
      search: 'outage',
      pageIndex: 2,
      pageSize: 20
    });
  });

  it.each(['', '+1', '-0', '-1', '1.5', '1e2', 'NaN', 'Infinity', '01', '9007199254740992'])(
    'rejects non-canonical or unsafe page indexes: %s',
    pageIndex => {
      expect(readStatusIncidentQuery(new URLSearchParams({ pageIndex })).pageIndex).toBe(0);
    }
  );

  it.each(['', '+20', '-20', '20.0', '2e1', 'NaN', 'Infinity', '08', '21', '9007199254740992'])(
    'rejects non-canonical or unsupported page sizes: %s',
    pageSize => {
      expect(readStatusIncidentQuery(new URLSearchParams({ pageSize })).pageSize).toBe(8);
    }
  );

  it('writes trimmed and canonical browser parameters', () => {
    expect(writeStatusIncidentQuery({ search: ' outage & recovery ', pageIndex: 3, pageSize: 50 }).toString()).toBe(
      'search=outage+%26+recovery&pageIndex=3&pageSize=50'
    );
    expect(writeStatusIncidentQuery({ search: ' ', pageIndex: Number.NaN, pageSize: 21 }).toString()).toBe(
      'pageIndex=0&pageSize=8'
    );
  });
});
