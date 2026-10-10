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

import { AlertContractError } from '../model/alert-model';
import { parseAlertGroupEvidence } from './alert-group-evidence-schema';

describe('alert group evidence wire schema', () => {
  it('strictly parses complete mixed group evidence for the exact requested ids', () => {
    expect(
      parseAlertGroupEvidence(
        {
          groups: [
            { id: 7, status: 'firing' },
            { id: 9, status: 'pending' }
          ],
          missingIds: [11],
          observedAt: 1_785_000_000_000
        },
        [11, 9, 7]
      )
    ).toEqual({
      groups: [
        { id: 7, status: 'firing' },
        { id: 9, status: 'pending' }
      ],
      missingIds: [11],
      observedAt: 1_785_000_000_000
    });
  });

  it.each([
    [
      'duplicate group',
      {
        groups: [
          { id: 7, status: 'firing' },
          { id: 7, status: 'resolved' }
        ],
        missingIds: []
      }
    ],
    ['duplicate missing id', { groups: [], missingIds: [7, 7] }],
    ['overlapping evidence', { groups: [{ id: 7, status: 'firing' }], missingIds: [7] }],
    ['unknown id', { groups: [{ id: 7, status: 'firing' }], missingIds: [10] }],
    ['incomplete coverage', { groups: [{ id: 7, status: 'firing' }], missingIds: [] }],
    ['unsupported status', { groups: [{ id: 7, status: 'unknown' }], missingIds: [9] }],
    ['invalid group id', { groups: [{ id: 0, status: 'firing' }], missingIds: [7, 9] }],
    ['unknown group field', { groups: [{ id: 7, status: 'firing', extra: true }], missingIds: [9] }],
    ['unknown top-level field', { groups: [{ id: 7, status: 'firing' }], missingIds: [9], extra: true }],
    [
      'unsorted groups',
      {
        groups: [
          { id: 9, status: 'firing' },
          { id: 7, status: 'resolved' }
        ],
        missingIds: []
      }
    ],
    ['unsorted missing ids', { groups: [], missingIds: [9, 7] }]
  ])('rejects %s in evidence coverage', (_label, evidence) => {
    expect(() => parseAlertGroupEvidence({ ...evidence, observedAt: 1_785_000_000_000 }, [7, 9])).toThrow(
      AlertContractError
    );
  });

  it.each([-1, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('rejects invalid evidence observedAt %s', observedAt => {
    expect(() =>
      parseAlertGroupEvidence({ groups: [{ id: 7, status: 'resolved' }], missingIds: [], observedAt }, [7])
    ).toThrow(AlertContractError);
  });

  it('rejects evidence requests above the frozen 100-id boundary', () => {
    const ids = Array.from({ length: 101 }, (_value, index) => index + 1);
    expect(() => parseAlertGroupEvidence({ groups: [], missingIds: ids, observedAt: 1 }, ids)).toThrow(
      AlertContractError
    );
  });
});
