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

import {
  INSTRUMENTATION_AUTOMATIC_WINDOW_MS,
  INSTRUMENTATION_POLL_AFTER_MS,
  INSTRUMENTATION_SIGNALS,
  type DetectionErrorCode,
  type DetectionResponse,
  type PollingDecision,
  type QueryJumpContext,
  type SignalDetection
} from './instrumentation-contract';
import {
  contractViolation,
  detectionResponseSchema,
  parseInstrumentationSchema
} from './instrumentation-schema';

export function parseDetectionResponse(value: unknown): DetectionResponse {
  const response = parseInstrumentationSchema(detectionResponseSchema, value, 'detection');
  Object.entries(response.signals).forEach(([signal, detection]) => {
    validateSignalDetection(detection, signal);
  });
  validatePolling(response);
  validateDetectionContext(response);
  return response;
}

function validateSignalDetection(detection: SignalDetection, label: string) {
  const { status, lastReceivedAt, errorCode } = detection;
  if (status === 'received' && (lastReceivedAt == null || errorCode != null)) {
    contractViolation(`${label} received invariant`);
  }
  if (status === 'waiting') validateEmptySignal(lastReceivedAt, errorCode, 'signal_not_received', label);
  if (status === 'unsupported') validateEmptySignal(lastReceivedAt, errorCode, 'signal_not_supported', label);
  if (status === 'unavailable' && (lastReceivedAt != null || errorCode == null)) {
    contractViolation(`${label} unavailable invariant`);
  }
  if (status === 'error' && errorCode == null) contractViolation(`${label} error invariant`);
}

function validateEmptySignal(
  lastReceivedAt: number | null,
  errorCode: DetectionErrorCode | null,
  expectedError: DetectionErrorCode,
  label: string
) {
  if (lastReceivedAt != null || errorCode !== expectedError) {
    contractViolation(`${label} empty signal invariant`);
  }
}

function validatePolling(response: DetectionResponse) {
  const { decision, pollAfterMs, deadlineAt } = response.polling;
  if (decision === 'continue_polling' && pollAfterMs !== INSTRUMENTATION_POLL_AFTER_MS) {
    contractViolation('Continue polling must use the v1 cadence');
  }
  if (decision !== 'continue_polling' && pollAfterMs != null) {
    contractViolation('Terminal polling cannot carry a delay');
  }
  if (deadlineAt !== response.context.startedAt + INSTRUMENTATION_AUTOMATIC_WINDOW_MS) {
    contractViolation('Detection deadline does not match the v1 window');
  }
  const states = Object.values(response.signals).map(item => item.status);
  const expectedDecision: PollingDecision = states.some(status => status === 'unavailable' || status === 'error')
    ? 'manual_retry'
    : states.some(status => status === 'waiting')
      ? response.detectedAt < deadlineAt ? 'continue_polling' : 'manual_retry'
      : 'complete';
  if (decision !== expectedDecision) contractViolation('Polling decision does not match signal states');
}

function validateDetectionContext(response: DetectionResponse) {
  const expected: QueryJumpContext = {
    serviceName: response.context.service.name,
    serviceNamespace: response.context.service.namespace,
    environment: response.context.service.environment,
    collectorId: response.context.collectorId,
    startedAt: response.context.startedAt,
    detectedAt: response.detectedAt
  };
  validateMatchingContext(response.queryJumpContext, expected, 'queryJumpContext');
  if (response.queryJumps.length !== INSTRUMENTATION_SIGNALS.length) {
    contractViolation('Detection must return three query jumps');
  }
  for (const signal of INSTRUMENTATION_SIGNALS) {
    const jump = response.queryJumps.find(item => item.signal === signal);
    if (!jump || jump.enabled !== (response.signals[signal].status === 'received')) {
      contractViolation(`Query jump state does not match ${signal}`);
    }
    validateMatchingContext(jump.context, response.queryJumpContext, `${signal} query jump context`);
  }
}

function validateMatchingContext(actual: QueryJumpContext, expected: QueryJumpContext, label: string) {
  const keys: Array<keyof QueryJumpContext> = [
    'serviceName', 'serviceNamespace', 'environment', 'collectorId', 'startedAt', 'detectedAt'
  ];
  if (keys.some(key => actual[key] !== expected[key])) {
    contractViolation(`${label} does not match detection context`);
  }
}
