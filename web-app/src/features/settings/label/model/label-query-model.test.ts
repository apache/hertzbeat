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

import { labelQueryAfterConfirmedDelete, readLabelQuery, writeLabelQuery } from './label-query-model';

describe('Label query model', () => {
  it('parses and writes only the canonical Label URL contract', () => {
    const query = readLabelQuery(
      new URLSearchParams('search=%20env%20&pageIndex=2&pageSize=50&token=private-token&panel=legacy')
    );

    expect(query).toEqual({ search: 'env', pageIndex: 2, pageSize: 50 });
    expect(writeLabelQuery(query).toString()).toBe('pageIndex=2&pageSize=50&search=env');
  });

  it.each([
    ['', { search: '', pageIndex: 0, pageSize: 20 }],
    ['pageIndex=-1&pageSize=50', { search: '', pageIndex: 0, pageSize: 50 }],
    ['pageIndex=1.5&pageSize=1000', { search: '', pageIndex: 0, pageSize: 20 }],
    ['pageIndex=2x&pageSize=20', { search: '', pageIndex: 0, pageSize: 20 }]
  ])('canonicalizes invalid query values from %s', (input, expected) => {
    expect(readLabelQuery(new URLSearchParams(input))).toEqual(expected);
  });

  it('moves only an unchanged nonzero query with one visible record to its previous page', () => {
    const deletedFrom = { search: 'env', pageIndex: 2, pageSize: 50 as const };

    expect(labelQueryAfterConfirmedDelete(deletedFrom, { query: deletedFrom, visibleRecords: 1 })).toEqual({
      search: 'env',
      pageIndex: 1,
      pageSize: 50
    });
    expect(labelQueryAfterConfirmedDelete(deletedFrom, { query: deletedFrom, visibleRecords: 2 })).toBeUndefined();
    expect(
      labelQueryAfterConfirmedDelete(
        { ...deletedFrom, search: 'production' },
        { query: deletedFrom, visibleRecords: 1 }
      )
    ).toBeUndefined();
    expect(
      labelQueryAfterConfirmedDelete(
        { ...deletedFrom, pageIndex: 0 },
        {
          query: { ...deletedFrom, pageIndex: 0 },
          visibleRecords: 1
        }
      )
    ).toBeUndefined();
  });
});
