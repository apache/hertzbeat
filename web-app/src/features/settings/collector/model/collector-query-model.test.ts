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

import { collectorQueryAfterConfirmedDelete, readCollectorQuery, writeCollectorQuery } from './collector-query-model';

describe('Collector query model', () => {
  it('keeps only the canonical zero-based name and pagination contract', () => {
    const query = readCollectorQuery(
      new URLSearchParams('name=%20edge%20&pageIndex=2&pageSize=15&token=private&panel=legacy')
    );

    expect(query).toEqual({ name: 'edge', pageIndex: 2, pageSize: 15 });
    expect(writeCollectorQuery(query).toString()).toBe('pageIndex=2&pageSize=15&name=edge');
  });

  it.each([
    ['', { name: '', pageIndex: 0, pageSize: 8 }],
    ['pageIndex=-1&pageSize=15', { name: '', pageIndex: 0, pageSize: 15 }],
    ['pageIndex=1.5&pageSize=1000', { name: '', pageIndex: 0, pageSize: 8 }],
    ['pageIndex=2x&pageSize=25', { name: '', pageIndex: 0, pageSize: 25 }]
  ])('canonicalizes invalid query values from %s', (input, expected) => {
    expect(readCollectorQuery(new URLSearchParams(input))).toEqual(expected);
  });

  it('moves an unchanged nonzero query back only after deleting its final visible row', () => {
    const deletedFrom = { name: 'edge', pageIndex: 2, pageSize: 15 as const };

    expect(collectorQueryAfterConfirmedDelete(deletedFrom, { query: deletedFrom, visibleRecords: 1 })).toEqual({
      ...deletedFrom,
      pageIndex: 1
    });
    expect(collectorQueryAfterConfirmedDelete(deletedFrom, { query: deletedFrom, visibleRecords: 2 })).toBeUndefined();
    expect(collectorQueryAfterConfirmedDelete(deletedFrom, { query: deletedFrom, visibleRecords: 2 }, 2)).toEqual({
      ...deletedFrom,
      pageIndex: 1
    });
    expect(
      collectorQueryAfterConfirmedDelete({ ...deletedFrom, name: 'west' }, { query: deletedFrom, visibleRecords: 1 })
    ).toBeUndefined();
  });
});
