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

import { PluginContractError, parsePluginPage, parsePluginWriteReceipt } from './plugin-schema';

const plugin = {
  id: 11,
  name: 'audit-plugin',
  enableStatus: true,
  creator: 'admin',
  gmtCreate: '2026-07-23T12:00:00',
  items: [],
  paramCount: 1
};

describe('plugin schema', () => {
  it('maps the exact coherent Spring page without retaining nested items', () => {
    expect(parsePluginPage(springPage([plugin], 1), { search: '', pageIndex: 0, pageSize: 8 })).toEqual({
      content: [
        {
          id: 11,
          name: 'audit-plugin',
          enableStatus: true,
          creator: 'admin',
          gmtCreate: '2026-07-23T12:00:00',
          paramCount: 1
        }
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
    expect(parsePluginWriteReceipt(null)).toBeNull();
  });

  it.each([
    [
      {
        ...springPage([{ ...plugin, jarFilePath: '/secret/plugin.jar' }], 1)
      }
    ],
    [
      {
        ...springPage([{ ...plugin, items: [{ id: 1, classIdentifier: 'safe', type: 'POST_ALERT', secret: 'x' }] }], 1)
      }
    ],
    [{ ...springPage([{ ...plugin, id: 0 }], 1) }],
    [{ ...springPage([plugin, plugin], 2) }],
    [{ ...springPage([], 1) }],
    [{ ...springPage([], 0), number: 1 }],
    [{ ...springPage([plugin], 1), unexpected: 'private-page-field' }]
  ])('rejects unsafe or incoherent plugin page %#', value => {
    expect(() => parsePluginPage(value, { search: '', pageIndex: 0, pageSize: 8 })).toThrow(PluginContractError);
  });

  it('rejects non-null write data', () => {
    expect(() => parsePluginWriteReceipt(true)).toThrow(PluginContractError);
  });
});

function springPage(content: unknown[], totalElements: number) {
  return {
    content,
    pageable: {
      pageNumber: 0,
      pageSize: 8,
      sort: { empty: true, sorted: false, unsorted: true },
      offset: 0,
      paged: true,
      unpaged: false
    },
    last: true,
    totalPages: totalElements === 0 ? 0 : 1,
    totalElements,
    size: 8,
    number: 0,
    sort: { empty: true, sorted: false, unsorted: true },
    first: true,
    numberOfElements: content.length,
    empty: content.length === 0
  };
}
