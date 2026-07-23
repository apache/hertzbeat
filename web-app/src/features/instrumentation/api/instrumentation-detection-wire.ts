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
} from '../model/instrumentation-contract';
import { contractViolation, detectionResponseSchema, parseInstrumentationSchema } from './instrumentation-schema';

export function parseDetectionResponse(value: unknown): DetectionResponse {
  const response = parseInstrumentationSchema(detectionResponseSchema, value, 'detection');
  Object.entries(response.signals).forEach(([signal, detection]) => {
    validateSignalDetection(detection, signal, response.context.startedAt, response.detectedAt);
  });
  validatePolling(response);
  validateDetectionContext(response);
  return response;
}

function validateSignalDetection(detection: SignalDetection, label: string, startedAt: number, detectedAt: number) {
  const { status, lastReceivedAt, errorCode } = detection;
  if (status === 'received') validateReceivedDetection(lastReceivedAt, errorCode, startedAt, detectedAt, label);
  if (status === 'waiting') validateEmptySignal(lastReceivedAt, errorCode, 'signal_not_received', label);
  if (status === 'unsupported') validateEmptySignal(lastReceivedAt, errorCode, 'signal_not_supported', label);
  if (status === 'unavailable' || status === 'error') validateFailureDetection(detection, label);
}

function validateReceivedDetection(
  lastReceivedAt: number | null,
  errorCode: DetectionErrorCode | null,
  startedAt: number,
  detectedAt: number,
  label: string
) {
  if (lastReceivedAt == null || errorCode != null || lastReceivedAt < startedAt || lastReceivedAt > detectedAt) {
    contractViolation(`${label} received invariant`);
  }
}

function validateFailureDetection(detection: SignalDetection, label: string) {
  if (detection.lastReceivedAt != null || detection.errorCode == null || isEmptySignalCode(detection.errorCode)) {
    contractViolation(`${label} ${detection.status} invariant`);
  }
}

function isEmptySignalCode(errorCode: DetectionErrorCode | null) {
  return errorCode === 'signal_not_received' || errorCode === 'signal_not_supported';
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
  if (decision !== expectedPollingDecision(response)) {
    contractViolation('Polling decision does not match signal states');
  }
}

function expectedPollingDecision(response: DetectionResponse): PollingDecision {
  const states = Object.values(response.signals).map(item => item.status);
  if (states.some(status => status === 'unavailable' || status === 'error')) return 'manual_retry';
  if (!states.some(status => status === 'waiting')) return 'complete';
  if (response.detectedAt < response.polling.deadlineAt) return 'continue_polling';
  return 'manual_retry';
}

function validateDetectionContext(response: DetectionResponse) {
  if (response.detectedAt <= response.context.startedAt) {
    contractViolation('Detection window must advance beyond its start');
  }
  const expected: QueryJumpContext = {
    serviceName: response.context.service.name,
    serviceNamespace: response.context.service.namespace,
    environment: response.context.service.environment,
    collectorId: response.context.collectorId,
    ...(response.context.service.serviceInstanceId
      ? { serviceInstanceId: response.context.service.serviceInstanceId }
      : {}),
    ...(response.context.service.endpoint ? { endpoint: response.context.service.endpoint } : {}),
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
    'serviceName',
    'serviceNamespace',
    'environment',
    'collectorId',
    'serviceInstanceId',
    'endpoint',
    'startedAt',
    'detectedAt'
  ];
  if (keys.some(key => actual[key] !== expected[key])) {
    contractViolation(`${label} does not match detection context`);
  }
}
