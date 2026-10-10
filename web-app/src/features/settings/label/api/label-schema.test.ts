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

import { LabelContractError } from '../model/label-model';
import { parseLabelPage } from './label-schema';

describe('Label response schema', () => {
  it('maps the Spring Page and omits nullable entity fields', () => {
    expect(
      parseLabelPage(
        springPage([
          {
            id: 7,
            name: 'env',
            tagValue: null,
            description: null,
            type: null,
            creator: null,
            modifier: null,
            gmtCreate: null,
            gmtUpdate: null
          }
        ]),
        { pageIndex: 0, pageSize: 20 }
      )
    ).toEqual({
      content: [{ id: 7, name: 'env' }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20
    });
  });

  it.each([
    springPage([
      {
        id: 7,
        name: 'env',
        gmtCreate: 1_650_000_000_000,
        gmtUpdate: '2026-07-18T10:30:00'
      }
    ]),
    { ...springPage([{ id: 7, name: 'env', privateField: 'secret' }]), unexpected: 'secret' }
  ])('rejects non-DTO Label page content %#', value => {
    expect(() => parseLabelPage(value, { pageIndex: 0, pageSize: 20 })).toThrow(LabelContractError);
  });

  it('uses a sanitized stable error for malformed content', () => {
    let error: unknown;
    try {
      parseLabelPage(
        springPage([
          {
            id: 7,
            name: 'private-label-response',
            tagValue: []
          }
        ]),
        { pageIndex: 0, pageSize: 20 }
      );
    } catch (reason) {
      error = reason;
    }

    expect(error).toBeInstanceOf(LabelContractError);
    expect(JSON.stringify(error)).not.toContain('private-label-response');
  });

  it('rejects an otherwise exact page with duplicate stable ids', () => {
    expect(() =>
      parseLabelPage(
        springPage([
          { id: 7, name: 'env' },
          { id: 7, name: 'service' }
        ]),
        { pageIndex: 0, pageSize: 20 }
      )
    ).toThrow(LabelContractError);
  });
});

function springPage(content: unknown[]) {
  return {
    content,
    pageable: {
      pageNumber: 0,
      pageSize: 20,
      sort: { empty: true, sorted: false, unsorted: true },
      offset: 0,
      paged: true,
      unpaged: false
    },
    last: true,
    totalPages: content.length === 0 ? 0 : 1,
    totalElements: content.length,
    size: 20,
    number: 0,
    sort: { empty: true, sorted: false, unsorted: true },
    first: true,
    numberOfElements: content.length,
    empty: content.length === 0
  };
}
