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

export const INSTRUMENTATION_SCHEMA_VERSION = 1 as const;
export const INSTRUMENTATION_POLL_AFTER_MS = 3_000;
export const INSTRUMENTATION_AUTOMATIC_WINDOW_MS = 120_000;

export const INSTRUMENTATION_LANGUAGES = ['java', 'dotnet', 'nodejs', 'python', 'php', 'go', 'generic'] as const;
export const INSTRUMENTATION_FRAMEWORKS = [
  'spring_boot',
  'java_jar',
  'aspnet_core',
  'nodejs',
  'express',
  'django',
  'flask',
  'php_generic',
  'laravel',
  'go_generic',
  'generic'
] as const;
export const INSTRUMENTATION_METHODS = ['zero_code', 'sdk', 'ebpf'] as const;
export const INSTRUMENTATION_ENVIRONMENTS = ['vm', 'docker', 'kubernetes', 'windows_service'] as const;
export const INSTRUMENTATION_PLATFORMS = [
  'linux_amd64',
  'linux_arm64',
  'macos_amd64',
  'macos_arm64',
  'windows_amd64',
  'any'
] as const;
export const INSTRUMENTATION_SIGNALS = ['metrics', 'logs', 'traces'] as const;
export const INSTRUMENTATION_CAPABILITIES = ['supported', 'preview', 'unsupported'] as const;
export const INSTRUMENTATION_VERSION_POLICIES = ['pinned', 'language_specific'] as const;
export const INSTRUMENTATION_STEP_TYPES = ['install', 'configure', 'start', 'container', 'disable'] as const;
export const INSTRUMENTATION_DETECTION_STATUSES = [
  'waiting',
  'received',
  'unsupported',
  'unavailable',
  'error'
] as const;
export const INSTRUMENTATION_DETECTION_ERROR_CODES = [
  'signal_not_received',
  'signal_not_supported',
  'storage_unavailable',
  'storage_query_failed',
  'collector_unavailable',
  'authentication_failed',
  'invalid_context'
] as const;
export const INSTRUMENTATION_POLLING_DECISIONS = ['continue_polling', 'complete', 'manual_retry'] as const;
export const INSTRUMENTATION_REQUEST_ERROR_CODES = [
  'instrumentation_schema_unsupported',
  'instrumentation_selection_invalid',
  'instrumentation_context_invalid'
] as const;

export type InstrumentationLanguage = (typeof INSTRUMENTATION_LANGUAGES)[number];
export type InstrumentationFramework = (typeof INSTRUMENTATION_FRAMEWORKS)[number];
export type InstrumentationMethod = (typeof INSTRUMENTATION_METHODS)[number];
export type InstrumentationEnvironment = (typeof INSTRUMENTATION_ENVIRONMENTS)[number];
export type InstrumentationPlatform = (typeof INSTRUMENTATION_PLATFORMS)[number];
export type InstrumentationSignal = (typeof INSTRUMENTATION_SIGNALS)[number];
export type SignalCapability = (typeof INSTRUMENTATION_CAPABILITIES)[number];
export type DetectionStatus = (typeof INSTRUMENTATION_DETECTION_STATUSES)[number];
export type DetectionErrorCode = (typeof INSTRUMENTATION_DETECTION_ERROR_CODES)[number];
export type PollingDecision = (typeof INSTRUMENTATION_POLLING_DECISIONS)[number];
export type InstrumentationRequestErrorCode = (typeof INSTRUMENTATION_REQUEST_ERROR_CODES)[number];

export type SignalValues<T> = { metrics: T; logs: T; traces: T };

export type ServiceIdentity = { name: string; namespace: string; environment: string };
export type CollectorTarget = {
  collectorId: string;
  otlpHttpEndpoint: string;
  otlpGrpcEndpoint: string;
  authorizationHeader: string;
};
export type InstrumentationSelection = {
  language: InstrumentationLanguage;
  framework: InstrumentationFramework;
  method: InstrumentationMethod;
  environment: InstrumentationEnvironment;
  platform: InstrumentationPlatform;
};
export type GuideRenderRequest = InstrumentationSelection & {
  schemaVersion: 1;
  collector: CollectorTarget;
  service: ServiceIdentity;
};
export type DetectionRequest = InstrumentationSelection & {
  schemaVersion: 1;
  service: ServiceIdentity;
  collectorId: string;
  startedAt: number;
};

export type OfficialDependency = {
  name: string;
  sourceUrl: string;
  version: string;
  license: string;
  purposeKey: string;
  official: boolean;
  bundledWithHertzBeat: boolean;
};
export type ArtifactVerification = {
  name: string;
  downloadUrl: string;
  algorithm: string;
  digest: string;
  provenanceUrl: string;
};
export type OfficialComponent = {
  name: string;
  sourceUrl: string;
  version: string | null;
  versionPolicy: (typeof INSTRUMENTATION_VERSION_POLICIES)[number];
  license: string;
  installationLocationKey: string;
  official: boolean;
  bundledWithHertzBeat: boolean;
  dependencies: OfficialDependency[];
  artifacts: ArtifactVerification[];
};
export type MethodOption = {
  method: InstrumentationMethod;
  labelKey: string;
  preview: boolean;
  environments: InstrumentationEnvironment[];
  platforms: InstrumentationPlatform[];
  signals: SignalValues<SignalCapability>;
  component: OfficialComponent;
};
export type CatalogResponse = {
  schemaVersion: 1;
  languages: Array<{
    language: InstrumentationLanguage;
    labelKey: string;
    frameworks: Array<{
      framework: InstrumentationFramework;
      labelKey: string;
      methods: MethodOption[];
    }>;
  }>;
};
export type SecretPlaceholder = {
  marker: string;
  valueFormat: 'url_unreserved';
  replacement: 'raw';
};
export type GuideSnippet = {
  id: string;
  language: string;
  content: string;
  secretPlaceholders: string[];
};
export type GuideStep = {
  id: string;
  type: (typeof INSTRUMENTATION_STEP_TYPES)[number];
  titleKey: string;
  executionLocationKey: string;
  snippets: GuideSnippet[];
};
export type GuideRenderResponse = {
  schemaVersion: 1;
  selection: InstrumentationSelection;
  signals: SignalValues<SignalCapability>;
  component: OfficialComponent;
  secretPlaceholders: Record<string, SecretPlaceholder>;
  steps: GuideStep[];
};
export type SignalDetection = {
  status: DetectionStatus;
  lastReceivedAt: number | null;
  errorCode: DetectionErrorCode | null;
};
export type QueryJumpContext = {
  serviceName: string;
  serviceNamespace: string;
  environment: string;
  collectorId: string;
  startedAt: number;
  detectedAt: number;
};
export type DetectionResponse = {
  schemaVersion: 1;
  detectedAt: number;
  context: InstrumentationSelection & {
    service: ServiceIdentity;
    collectorId: string;
    startedAt: number;
  };
  signals: SignalValues<SignalDetection>;
  polling: { decision: PollingDecision; pollAfterMs: number | null; deadlineAt: number };
  queryJumpContext: QueryJumpContext;
  queryJumps: Array<{ signal: InstrumentationSignal; enabled: boolean; context: QueryJumpContext }>;
};
