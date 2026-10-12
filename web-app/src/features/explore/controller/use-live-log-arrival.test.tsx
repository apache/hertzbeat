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

import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { appendLogEvidence, useScopedLiveLogState } from './use-live-log-evidence-state';
import { claimLogArrival, logArrival } from '@/shared/log-arrival';
import type { LiveLogRow } from '../model/explore-signal-contract';

it('marks only unique IDs in a batch and retained buffer while preserving distinct timestamp peers', () => {
  const first: LiveLogRow = {
    attributes: { 'log.record.uid': 'first' },
    severityNumber: 9,
    severityText: 'INFO',
    body: 'record',
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    instrumentationScope: null,
    resourceSchemaUrl: null,
    scopeSchemaUrl: null,
    timeUnixNano: null,
    observedTimeUnixNano: null
  };
  const duplicate = { ...first };
  const peer = { ...first, attributes: { 'log.record.uid': 'peer' } };
  const { result } = renderHook(() => useScopedLiveLogState('logs', 'connection'));
  act(() => appendLogEvidence(result.current.setEvidenceState, 'logs', [first, duplicate, peer]));
  expect(claimLogArrival(logArrival(first))).toBeDefined();
  expect(logArrival(duplicate)).toBeUndefined();
  expect(claimLogArrival(logArrival(peer))).toBeDefined();
  const replay = { ...first };
  act(() => appendLogEvidence(result.current.setEvidenceState, 'logs', [replay]));
  expect(logArrival(replay)).toBeUndefined();
});
