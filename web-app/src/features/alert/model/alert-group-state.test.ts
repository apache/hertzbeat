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

import type { AlertGroupConverge, AlertGroupPage } from './alert-group-model';
import { resolveAlertGroupListState } from './alert-group-state';

const record: AlertGroupConverge = {
  id: 7,
  name: 'By service',
  groupLabels: ['service'],
  groupWait: 30,
  groupInterval: 300,
  repeatInterval: 0,
  enable: true
};

describe('Alert Group list state', () => {
  it('keeps pending evidence loading regardless of an older failure or page', () => {
    expect(resolveAlertGroupListState(true, 'unavailable', page([record], 1))).toEqual({ kind: 'loading' });
  });

  it.each(['unavailable', 'error'] as const)('preserves the %s failure kind', failure => {
    expect(resolveAlertGroupListState(false, failure, undefined)).toEqual({ kind: failure });
  });

  it('treats an absent successful page as invalid evidence', () => {
    expect(resolveAlertGroupListState(false, null, undefined)).toEqual({ kind: 'error' });
  });

  it('distinguishes a true empty result from an out-of-range empty page', () => {
    expect(resolveAlertGroupListState(false, null, page([], 0))).toEqual({ kind: 'empty' });
    expect(resolveAlertGroupListState(false, null, page([], 5))).toEqual({
      kind: 'ready',
      records: [],
      total: 5
    });
  });

  it('preserves ready records and the authoritative total', () => {
    expect(resolveAlertGroupListState(false, null, page([record], 9))).toEqual({
      kind: 'ready',
      records: [record],
      total: 9
    });
  });
});

function page(content: AlertGroupConverge[], totalElements: number): AlertGroupPage {
  return {
    content,
    totalElements,
    totalPages: totalElements === 0 ? 0 : 2,
    number: 0,
    size: 8
  };
}
