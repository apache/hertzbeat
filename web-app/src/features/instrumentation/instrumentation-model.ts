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
  INSTRUMENTATION_CAPABILITIES as capabilities,
  INSTRUMENTATION_DETECTION_ERROR_CODES as detectionErrorCodes,
  INSTRUMENTATION_DETECTION_STATUSES as detectionStatuses,
  INSTRUMENTATION_ENVIRONMENTS as environments,
  INSTRUMENTATION_FRAMEWORKS as frameworks,
  INSTRUMENTATION_LANGUAGES as languages,
  INSTRUMENTATION_METHODS as methods,
  INSTRUMENTATION_PLATFORMS as platforms,
  INSTRUMENTATION_POLL_AFTER_MS,
  INSTRUMENTATION_POLLING_DECISIONS as pollingDecisions,
  INSTRUMENTATION_SCHEMA_VERSION,
  INSTRUMENTATION_SIGNALS as signals,
  INSTRUMENTATION_STEP_TYPES as stepTypes,
  INSTRUMENTATION_VERSION_POLICIES as versionPolicies,
  type ArtifactVerification,
  type CatalogResponse,
  type DetectionErrorCode,
  type DetectionRequest,
  type DetectionResponse,
  type GuideRenderRequest,
  type GuideRenderResponse,
  type GuideSnippet,
  type InstrumentationSelection,
  type MethodOption,
  type OfficialComponent,
  type OfficialDependency,
  type PollingDecision,
  type QueryJumpContext,
  type SecretPlaceholder,
  type ServiceIdentity,
  type SignalDetection,
  type SignalValues
} from './instrumentation-contract';

export class InstrumentationContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstrumentationContractError';
  }
}

export function parseCatalogResponse(value: unknown): CatalogResponse {
  const root = schemaRecord(value, 'catalog');
  return {
    schemaVersion: 1,
    languages: array(root.languages, 'catalog.languages').map((entry, languageIndex) => {
      const language = record(entry, `catalog.languages[${languageIndex}]`);
      return {
        language: enumValue(language.language, languages, 'catalog language'),
        labelKey: string(language.labelKey, 'catalog language labelKey'),
        frameworks: array(language.frameworks, 'catalog frameworks').map((item, frameworkIndex) => {
          const framework = record(item, `catalog.frameworks[${frameworkIndex}]`);
          return {
            framework: enumValue(framework.framework, frameworks, 'catalog framework'),
            labelKey: string(framework.labelKey, 'catalog framework labelKey'),
            methods: array(framework.methods, 'catalog methods').map(parseMethodOption)
          };
        })
      };
    })
  };
}

export function parseGuideRenderResponse(value: unknown): GuideRenderResponse {
  const root = schemaRecord(value, 'guide');
  const placeholders = record(root.secretPlaceholders, 'guide.secretPlaceholders');
  return {
    schemaVersion: 1,
    selection: parseSelection(root.selection, 'guide.selection'),
    signals: parseCapabilities(root.signals, 'guide.signals'),
    component: parseComponent(root.component),
    secretPlaceholders: Object.fromEntries(Object.entries(placeholders).map(([key, item]) => {
      const placeholder = record(item, `guide.secretPlaceholders.${key}`);
      return [key, {
        marker: string(placeholder.marker, 'secret marker'),
        valueFormat: enumValue(placeholder.valueFormat, ['url_unreserved'] as const, 'secret valueFormat'),
        replacement: enumValue(placeholder.replacement, ['raw'] as const, 'secret replacement')
      }];
    })),
    steps: array(root.steps, 'guide.steps').map((item, stepIndex) => {
      const step = record(item, `guide.steps[${stepIndex}]`);
      return {
        id: string(step.id, 'guide step id'),
        type: enumValue(step.type, stepTypes, 'guide step type'),
        titleKey: string(step.titleKey, 'guide step titleKey'),
        executionLocationKey: string(step.executionLocationKey, 'guide executionLocationKey'),
        snippets: array(step.snippets, 'guide snippets').map(parseSnippet)
      };
    })
  };
}

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

export function buildGuideRenderPayload(request: GuideRenderRequest): GuideRenderRequest {
  return {
    schemaVersion: 1,
    ...copySelection(request),
    collector: {
      collectorId: request.collector.collectorId,
      otlpHttpEndpoint: request.collector.otlpHttpEndpoint,
      otlpGrpcEndpoint: request.collector.otlpGrpcEndpoint,
      authorizationHeader: request.collector.authorizationHeader
    },
    service: copyService(request.service)
  };
}

export function buildDetectionPayload(request: DetectionRequest): DetectionRequest {
  return {
    schemaVersion: 1,
    ...copySelection(request),
    service: copyService(request.service),
    collectorId: request.collectorId,
    startedAt: request.startedAt
  };
}

export function materializeSnippetForCopy(
  snippet: GuideSnippet,
  placeholders: Record<string, SecretPlaceholder>,
  transientSecrets: Record<string, string | undefined>
) {
  let content = snippet.content;
  for (const placeholderId of snippet.secretPlaceholders) {
    const placeholder = placeholders[placeholderId];
    const secret = transientSecrets[placeholderId];
    if (!placeholder || placeholder.valueFormat !== 'url_unreserved' || placeholder.replacement !== 'raw') {
      throw new InstrumentationContractError(`Unsupported secret placeholder: ${placeholderId}`);
    }
    if (!secret || !/^[A-Za-z0-9._~-]+$/.test(secret)) {
      throw new InstrumentationContractError(`Invalid transient secret: ${placeholderId}`);
    }
    if (!content.includes(placeholder.marker)) {
      throw new InstrumentationContractError(`Secret marker is missing: ${placeholderId}`);
    }
    content = content.replaceAll(placeholder.marker, secret);
  }
  return content;
}

function parseMethodOption(value: unknown, index: number): MethodOption {
  const method = record(value, `catalog method[${index}]`);
  return {
    method: enumValue(method.method, methods, 'catalog method'),
    labelKey: string(method.labelKey, 'catalog method labelKey'),
    preview: boolean(method.preview, 'catalog method preview'),
    environments: array(method.environments, 'catalog environments').map(item =>
      enumValue(item, environments, 'catalog environment')),
    platforms: array(method.platforms, 'catalog platforms').map(item =>
      enumValue(item, platforms, 'catalog platform')),
    signals: parseCapabilities(method.signals, 'catalog signals'),
    component: parseComponent(method.component)
  };
}

function parseComponent(value: unknown): OfficialComponent {
  const component = record(value, 'component');
  return {
    name: string(component.name, 'component name'),
    sourceUrl: string(component.sourceUrl, 'component sourceUrl'),
    version: nullableString(component.version, 'component version'),
    versionPolicy: enumValue(component.versionPolicy, versionPolicies, 'component versionPolicy'),
    license: string(component.license, 'component license'),
    installationLocationKey: string(component.installationLocationKey, 'component location key'),
    official: boolean(component.official, 'component official'),
    bundledWithHertzBeat: boolean(component.bundledWithHertzBeat, 'component bundled flag'),
    dependencies: array(component.dependencies, 'component dependencies').map(parseDependency),
    artifacts: array(component.artifacts, 'component artifacts').map(parseArtifact)
  };
}

function parseDependency(value: unknown, index: number): OfficialDependency {
  const dependency = record(value, `component dependency[${index}]`);
  return {
    name: string(dependency.name, 'dependency name'),
    sourceUrl: string(dependency.sourceUrl, 'dependency sourceUrl'),
    version: string(dependency.version, 'dependency version'),
    license: string(dependency.license, 'dependency license'),
    purposeKey: string(dependency.purposeKey, 'dependency purposeKey'),
    official: boolean(dependency.official, 'dependency official'),
    bundledWithHertzBeat: boolean(dependency.bundledWithHertzBeat, 'dependency bundled flag')
  };
}

function parseArtifact(value: unknown, index: number): ArtifactVerification {
  const artifact = record(value, `component artifact[${index}]`);
  return {
    name: string(artifact.name, 'artifact name'),
    downloadUrl: string(artifact.downloadUrl, 'artifact downloadUrl'),
    algorithm: string(artifact.algorithm, 'artifact algorithm'),
    digest: string(artifact.digest, 'artifact digest'),
    provenanceUrl: string(artifact.provenanceUrl, 'artifact provenanceUrl')
  };
}

function parseSnippet(value: unknown, index: number): GuideSnippet {
  const snippet = record(value, `guide snippet[${index}]`);
  return {
    id: string(snippet.id, 'snippet id'),
    language: string(snippet.language, 'snippet language'),
    content: string(snippet.content, 'snippet content'),
    secretPlaceholders: array(snippet.secretPlaceholders, 'snippet placeholders').map((item, placeholderIndex) =>
      string(item, `snippet placeholder[${placeholderIndex}]`))
  };
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

function parseCapabilities(value: unknown, label: string) {
  return parseSignalValues(value, (item, itemLabel) => enumValue(item, capabilities, itemLabel), label);
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

function copySelection(selection: InstrumentationSelection): InstrumentationSelection {
  return {
    language: selection.language,
    framework: selection.framework,
    method: selection.method,
    environment: selection.environment,
    platform: selection.platform
  };
}

function copyService(service: ServiceIdentity): ServiceIdentity {
  return { name: service.name, namespace: service.namespace, environment: service.environment };
}

function schemaRecord(value: unknown, label: string) {
  const parsed = record(value, label);
  if (parsed.schemaVersion !== INSTRUMENTATION_SCHEMA_VERSION) contract(`${label} schemaVersion must be 1`);
  return parsed;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) contract(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) contract(`${label} must be an array`);
  return value;
}

function string(value: unknown, label: string) {
  if (typeof value !== 'string' || !value) contract(`${label} must be a non-empty string`);
  return value;
}

function nullableString(value: unknown, label: string) {
  if (value === null) return null;
  return string(value, label);
}

function boolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') contract(`${label} must be a boolean`);
  return value;
}

function positiveNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    contract(`${label} must be a positive epoch millisecond integer`);
  }
  return value;
}

function nullablePositiveNumber(value: unknown, label: string) {
  if (value === null) return null;
  return positiveNumber(value, label);
}

function enumValue<const T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) contract(`${label} is unsupported`);
  return value;
}

function nullableEnumValue<const T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] | null {
  if (value === null) return null;
  return enumValue(value, allowed, label);
}

function contract(message: string): never {
  throw new InstrumentationContractError(message);
}
