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
  INSTRUMENTATION_DETECTION_ERROR_CODES as detectionErrorCodes,
  INSTRUMENTATION_DETECTION_STATUSES as detectionStatuses,
  INSTRUMENTATION_ENVIRONMENTS as environments,
  INSTRUMENTATION_FRAMEWORKS as frameworks,
  INSTRUMENTATION_LANGUAGES as languages,
  INSTRUMENTATION_METHODS as methods,
  INSTRUMENTATION_PLATFORMS as platforms,
  INSTRUMENTATION_POLL_AFTER_MS,
  INSTRUMENTATION_POLLING_DECISIONS as pollingDecisions,
  INSTRUMENTATION_SIGNALS as signals,
  type DetectionErrorCode,
  type DetectionResponse,
  type InstrumentationSelection,
  type PollingDecision,
  type QueryJumpContext,
  type ServiceIdentity,
  type SignalDetection,
  type SignalValues
} from './instrumentation-contract';
import {
  array,
  boolean,
  contract,
  enumValue,
  nullableEnumValue,
  nullablePositiveNumber,
  positiveNumber,
  record,
  schemaRecord,
  string
} from './instrumentation-wire-values';

export function parseDetectionResponse(value: unknown): DetectionResponse {
  const root = schemaRecord(value, 'detection');
  const contextRecord = record(root.context, 'detection.context');
  const parsedSignals = parseSignalValues(root.signals, parseSignalDetection, 'detection.signals');
  const response: DetectionResponse = {
    schemaVersion: 1,
    detectedAt: positiveNumber(root.detectedAt, 'detection.detectedAt'),
    context: {
      ...parseSelection(contextRecord, 'detection.context'),
      service: parseService(contextRecord.service),
      collectorId: string(contextRecord.collectorId, 'detection collectorId'),
      startedAt: positiveNumber(contextRecord.startedAt, 'detection startedAt')
    },
    signals: parsedSignals,
    polling: parsePolling(root.polling),
    queryJumpContext: parseQueryJumpContext(root.queryJumpContext),
    queryJumps: array(root.queryJumps, 'detection.queryJumps').map((item, jumpIndex) => {
      const jump = record(item, `detection.queryJumps[${jumpIndex}]`);
      return {
        signal: enumValue(jump.signal, signals, 'query jump signal'),
        enabled: boolean(jump.enabled, 'query jump enabled'),
        context: parseQueryJumpContext(jump.context)
      };
    })
  };
  validateDetectionResponse(response);
  return response;
}

function parseSignalDetection(value: unknown, label: string): SignalDetection {
  const detection = record(value, label);
  const parsed: SignalDetection = {
    status: enumValue(detection.status, detectionStatuses, `${label}.status`),
    lastReceivedAt: nullablePositiveNumber(detection.lastReceivedAt, `${label}.lastReceivedAt`),
    errorCode: nullableEnumValue(detection.errorCode, detectionErrorCodes, `${label}.errorCode`)
  };
  const { status, lastReceivedAt, errorCode } = parsed;
  if (status === 'received') validateReceivedSignal(lastReceivedAt, errorCode, label);
  if (status === 'waiting') validateEmptySignal(lastReceivedAt, errorCode, 'signal_not_received', label);
  if (status === 'unsupported') validateEmptySignal(lastReceivedAt, errorCode, 'signal_not_supported', label);
  if (status === 'unavailable') validateUnavailableSignal(lastReceivedAt, errorCode, label);
  if (status === 'error') validateErrorSignal(errorCode, label);
  return parsed;
}

function validateReceivedSignal(lastReceivedAt: number | null, errorCode: DetectionErrorCode | null, label: string) {
  if (lastReceivedAt == null || errorCode != null) contract(`${label} received invariant`);
}

function validateEmptySignal(
  lastReceivedAt: number | null,
  errorCode: DetectionErrorCode | null,
  expectedError: DetectionErrorCode,
  label: string
) {
  if (lastReceivedAt != null || errorCode !== expectedError) contract(`${label} empty signal invariant`);
}

function validateUnavailableSignal(
  lastReceivedAt: number | null,
  errorCode: DetectionErrorCode | null,
  label: string
) {
  if (lastReceivedAt != null || errorCode == null) contract(`${label} unavailable invariant`);
}

function validateErrorSignal(errorCode: DetectionErrorCode | null, label: string) {
  if (errorCode == null) contract(`${label} error invariant`);
}

function parsePolling(value: unknown): DetectionResponse['polling'] {
  const polling = record(value, 'detection.polling');
  const decision = enumValue(polling.decision, pollingDecisions, 'polling decision');
  const pollAfterMs = nullablePositiveNumber(polling.pollAfterMs, 'pollAfterMs');
  if (decision === 'continue_polling' && pollAfterMs !== INSTRUMENTATION_POLL_AFTER_MS) {
    contract('Continue polling must use the v1 cadence');
  }
  if (decision !== 'continue_polling' && pollAfterMs != null) contract('Terminal polling cannot carry a delay');
  return { decision, pollAfterMs, deadlineAt: positiveNumber(polling.deadlineAt, 'polling deadlineAt') };
}

function parseQueryJumpContext(value: unknown): QueryJumpContext {
  const context = record(value, 'query jump context');
  return {
    serviceName: string(context.serviceName, 'query serviceName'),
    serviceNamespace: string(context.serviceNamespace, 'query serviceNamespace'),
    environment: string(context.environment, 'query environment'),
    collectorId: string(context.collectorId, 'query collectorId'),
    startedAt: positiveNumber(context.startedAt, 'query startedAt'),
    detectedAt: positiveNumber(context.detectedAt, 'query detectedAt')
  };
}

function validateDetectionResponse(response: DetectionResponse) {
  if (response.polling.deadlineAt !== response.context.startedAt + INSTRUMENTATION_AUTOMATIC_WINDOW_MS) {
    contract('Detection deadline does not match the v1 window');
  }
  const expectedQueryContext: QueryJumpContext = {
    serviceName: response.context.service.name,
    serviceNamespace: response.context.service.namespace,
    environment: response.context.service.environment,
    collectorId: response.context.collectorId,
    startedAt: response.context.startedAt,
    detectedAt: response.detectedAt
  };
  validateMatchingQueryContext(response.queryJumpContext, expectedQueryContext, 'queryJumpContext');
  if (response.queryJumps.length !== signals.length) contract('Detection must return three query jumps');
  for (const signal of signals) {
    const jump = response.queryJumps.find(item => item.signal === signal);
    if (!jump || jump.enabled !== (response.signals[signal].status === 'received')) {
      contract(`Query jump state does not match ${signal}`);
    }
    validateMatchingQueryContext(jump.context, response.queryJumpContext, `${signal} query jump context`);
  }
  const states = Object.values(response.signals).map(item => item.status);
  const expectedDecision: PollingDecision = states.some(status => status === 'unavailable' || status === 'error')
    ? 'manual_retry'
    : states.some(status => status === 'waiting')
      ? response.detectedAt < response.polling.deadlineAt ? 'continue_polling' : 'manual_retry'
      : 'complete';
  if (response.polling.decision !== expectedDecision) contract('Polling decision does not match signal states');
}

function validateMatchingQueryContext(actual: QueryJumpContext, expected: QueryJumpContext, label: string) {
  const keys = [
    'serviceName',
    'serviceNamespace',
    'environment',
    'collectorId',
    'startedAt',
    'detectedAt'
  ] as const;
  if (keys.some(key => actual[key] !== expected[key])) contract(`${label} does not match detection context`);
}

function parseSelection(value: unknown, label: string): InstrumentationSelection {
  const selection = record(value, label);
  return {
    language: enumValue(selection.language, languages, `${label}.language`),
    framework: enumValue(selection.framework, frameworks, `${label}.framework`),
    method: enumValue(selection.method, methods, `${label}.method`),
    environment: enumValue(selection.environment, environments, `${label}.environment`),
    platform: enumValue(selection.platform, platforms, `${label}.platform`)
  };
}

function parseSignalValues<T>(value: unknown, parser: (item: unknown, label: string) => T, label: string): SignalValues<T> {
  const values = record(value, label);
  return {
    metrics: parser(values.metrics, `${label}.metrics`),
    logs: parser(values.logs, `${label}.logs`),
    traces: parser(values.traces, `${label}.traces`)
  };
}

function parseService(value: unknown): ServiceIdentity {
  const service = record(value, 'service');
  return {
    name: string(service.name, 'service name'),
    namespace: string(service.namespace, 'service namespace'),
    environment: string(service.environment, 'service environment')
  };
}
