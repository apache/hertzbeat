/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
