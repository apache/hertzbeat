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
  INSTRUMENTATION_CAPABILITIES as capabilities,
  INSTRUMENTATION_ENVIRONMENTS as environments,
  INSTRUMENTATION_FRAMEWORKS as frameworks,
  INSTRUMENTATION_LANGUAGES as languages,
  INSTRUMENTATION_METHODS as methods,
  INSTRUMENTATION_PLATFORMS as platforms,
  INSTRUMENTATION_STEP_TYPES as stepTypes,
  INSTRUMENTATION_VERSION_POLICIES as versionPolicies,
  type ArtifactVerification,
  type CatalogResponse,
  type DetectionRequest,
  type GuideRenderRequest,
  type GuideRenderResponse,
  type GuideSnippet,
  type InstrumentationSelection,
  type MethodOption,
  type OfficialComponent,
  type OfficialDependency,
  type SecretPlaceholder,
  type ServiceIdentity,
  type SignalValues
} from './instrumentation-contract';
import {
  array,
  boolean,
  enumValue,
  InstrumentationContractError,
  nullableString,
  record,
  schemaRecord,
  string
} from './instrumentation-wire-values';

export { parseDetectionResponse } from './instrumentation-detection-wire';
export { InstrumentationContractError } from './instrumentation-wire-values';

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
  const response: GuideRenderResponse = {
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
  validateSecretPlaceholders(response);
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
  const official = boolean(component.official, 'component official');
  const bundledWithHertzBeat = boolean(component.bundledWithHertzBeat, 'component bundled flag');
  requireOfficialExternalPackage(official, bundledWithHertzBeat, 'component');
  return {
    name: string(component.name, 'component name'),
    sourceUrl: string(component.sourceUrl, 'component sourceUrl'),
    version: nullableString(component.version, 'component version'),
    versionPolicy: enumValue(component.versionPolicy, versionPolicies, 'component versionPolicy'),
    license: string(component.license, 'component license'),
    installationLocationKey: string(component.installationLocationKey, 'component location key'),
    official,
    bundledWithHertzBeat,
    dependencies: array(component.dependencies, 'component dependencies').map(parseDependency),
    artifacts: array(component.artifacts, 'component artifacts').map(parseArtifact)
  };
}

function parseDependency(value: unknown, index: number): OfficialDependency {
  const dependency = record(value, `component dependency[${index}]`);
  const official = boolean(dependency.official, 'dependency official');
  const bundledWithHertzBeat = boolean(dependency.bundledWithHertzBeat, 'dependency bundled flag');
  requireOfficialExternalPackage(official, bundledWithHertzBeat, 'dependency');
  return {
    name: string(dependency.name, 'dependency name'),
    sourceUrl: string(dependency.sourceUrl, 'dependency sourceUrl'),
    version: string(dependency.version, 'dependency version'),
    license: string(dependency.license, 'dependency license'),
    purposeKey: string(dependency.purposeKey, 'dependency purposeKey'),
    official,
    bundledWithHertzBeat
  };
}

function requireOfficialExternalPackage(official: boolean, bundledWithHertzBeat: boolean, label: string) {
  if (!official || bundledWithHertzBeat) {
    throw new InstrumentationContractError(`${label} must be official and external to HertzBeat`);
  }
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

function validateSecretPlaceholders(response: GuideRenderResponse) {
  const placeholders = Object.entries(response.secretPlaceholders);
  validateUniqueSecretMarkers(placeholders);
  const referenced = new Set<string>();
  for (const step of response.steps) {
    for (const snippet of step.snippets) validateSnippetSecretReferences(snippet, placeholders, referenced);
  }
  if (placeholders.some(([name]) => !referenced.has(name))) {
    throw new InstrumentationContractError('Guide secret placeholder was unused');
  }
}

function validateUniqueSecretMarkers(placeholders: Array<[string, SecretPlaceholder]>) {
  const markerOwners = new Set<string>();
  for (const [name, placeholder] of placeholders) {
    if (!name || markerOwners.has(placeholder.marker)) {
      throw new InstrumentationContractError('Guide secret placeholder names and markers must be unique');
    }
    markerOwners.add(placeholder.marker);
  }
}

function validateSnippetSecretReferences(
  snippet: GuideSnippet,
  placeholders: Array<[string, SecretPlaceholder]>,
  referenced: Set<string>
) {
  for (const name of snippet.secretPlaceholders) {
    const placeholder = placeholders.find(([candidate]) => candidate === name)?.[1];
    if (!placeholder || !snippet.content.includes(placeholder.marker)) {
      throw new InstrumentationContractError('Guide snippet secret reference was invalid');
    }
    referenced.add(name);
  }
  for (const [name, placeholder] of placeholders) {
    if (snippet.content.includes(placeholder.marker) && !snippet.secretPlaceholders.includes(name)) {
      throw new InstrumentationContractError('Guide snippet secret marker was undeclared');
    }
  }
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
