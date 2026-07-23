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

import { describe, expect, it } from 'vitest';

import type { CatalogResponse } from './instrumentation-contract';
import { createFlowDraft, type FlowStage, type InstrumentationFlowDraft } from './instrumentation-flow';
import { buildInstrumentationScopeSummary } from './instrumentation-scope';

describe('instrumentation scope summary', () => {
  it('shows only confirmed runtime choices at stage 1', () => {
    const summary = buildInstrumentationScopeSummary(1, configuredDraft(), catalog, true);

    expect(fields(summary)).toEqual(['deploymentEnvironment', 'platform']);
    expect(summary.signals).toBeUndefined();
    expect(JSON.stringify(summary)).not.toMatch(/collector|service|token|instance|endpoint/i);
  });

  it('adds only an actual complete selection and its signal capabilities at stage 2', () => {
    expect(fields(buildInstrumentationScopeSummary(2, createFlowDraft(), catalog, false))).toEqual([
      'deploymentEnvironment',
      'platform'
    ]);

    const summary = buildInstrumentationScopeSummary(2, configuredDraft(), catalog, true);
    expect(fields(summary)).toEqual(['deploymentEnvironment', 'platform', 'language', 'framework', 'method']);
    expect(summary.signals).toEqual({ metrics: 'supported', logs: 'preview', traces: 'supported' });
  });

  it.each([3, 4, 5] as FlowStage[])('adds only non-empty service context and Token presence at stage %s', stage => {
    const draft = {
      ...configuredDraft(),
      serviceNamespace: ' ',
      serviceInstanceId: 'hidden-instance',
      endpoint: '/hidden-endpoint'
    };
    const summary = buildInstrumentationScopeSummary(stage, draft, catalog, false);

    expect(fields(summary)).toEqual([
      'deploymentEnvironment',
      'platform',
      'language',
      'framework',
      'method',
      'collector',
      'serviceName',
      'serviceEnvironment',
      'token'
    ]);
    expect(summary.rows.at(-1)?.value).toEqual({
      kind: 'translation',
      key: 'instrumentation.tokenMissing'
    });
    expect(JSON.stringify(summary)).not.toMatch(/hidden-instance|hidden-endpoint/);
  });

  it('represents a Token only by its memory-presence state', () => {
    const summary = buildInstrumentationScopeSummary(3, configuredDraft(), catalog, true);

    expect(summary.rows.at(-1)?.value).toEqual({
      kind: 'translation',
      key: 'instrumentation.tokenInMemory'
    });
  });
});

function fields(summary: ReturnType<typeof buildInstrumentationScopeSummary>) {
  return summary.rows.map(row => row.field);
}

function configuredDraft(): InstrumentationFlowDraft {
  return {
    environment: 'docker',
    platform: 'linux_amd64',
    selection: {
      language: 'go',
      framework: 'go_generic',
      method: 'sdk',
      environment: 'docker',
      platform: 'linux_amd64'
    },
    collectorId: 'collector-east',
    serviceName: 'checkout-api',
    serviceNamespace: 'commerce',
    serviceEnvironment: 'prod'
  };
}

const catalog: CatalogResponse = {
  schemaVersion: 1,
  languages: [
    {
      language: 'go',
      labelKey: 'instrumentation.language.go',
      frameworks: [
        {
          framework: 'go_generic',
          labelKey: 'instrumentation.framework.go_generic',
          methods: [
            {
              method: 'sdk',
              labelKey: 'instrumentation.method.sdk',
              preview: false,
              environments: ['docker'],
              platforms: ['linux_amd64'],
              signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
              component: {
                name: 'OpenTelemetry Go SDK',
                sourceUrl: 'https://opentelemetry.io/',
                version: '1.43.0',
                versionPolicy: 'pinned',
                license: 'Apache-2.0',
                installationLocationKey: 'instrumentation.location.application_host',
                official: true,
                bundledWithHertzBeat: false,
                dependencies: [],
                artifacts: []
              }
            }
          ]
        }
      ]
    }
  ]
};
