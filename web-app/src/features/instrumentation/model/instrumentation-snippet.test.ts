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

import type { GuideRenderResponse } from './instrumentation-contract';
import {
  InstrumentationSnippetError,
  materializeGuideSnippet,
  materializeSnippetForCopy
} from './instrumentation-snippet';

const snippet = {
  id: 'otel-environment',
  language: 'bash',
  content: "export OTEL_EXPORTER_OTLP_HEADERS='Authorization=Bearer%20${HERTZBEAT_TOKEN}'",
  secretPlaceholders: ['authorizationToken']
};
const placeholders = {
  authorizationToken: {
    marker: '${HERTZBEAT_TOKEN}',
    valueFormat: 'url_unreserved' as const,
    replacement: 'raw' as const
  }
};

describe('instrumentation copy-only snippet materializer', () => {
  it('returns a temporary materialized string without changing the canonical snippet', () => {
    const original = structuredClone(snippet);

    expect(
      materializeSnippetForCopy(snippet, placeholders, {
        authorizationToken: 'hb.token-1_~'
      })
    ).toContain('Bearer%20hb.token-1_~');
    expect(snippet).toEqual(original);
    expect(snippet.content).toContain('${HERTZBEAT_TOKEN}');
  });

  it('rejects absent or unsafe transient secret material', () => {
    for (const authorizationToken of [undefined, '', 'token with spaces']) {
      expect(() => materializeSnippetForCopy(snippet, placeholders, { authorizationToken })).toThrow(
        InstrumentationSnippetError
      );
    }
    expect(snippet.content).toContain('${HERTZBEAT_TOKEN}');
  });

  it('keeps the guide token copy-only and refuses materialization while it is absent', () => {
    const guideSnippet = guide.steps[0]!.snippets[0]!;

    expect(() => materializeGuideSnippet(guideSnippet, guide, '')).toThrow(/token/i);
    expect(materializeGuideSnippet(guideSnippet, guide, 'hb_memory_only')).toContain('hb_memory_only');
    expect(guideSnippet.content).toContain('${HERTZBEAT_TOKEN}');
  });
});

const guide: GuideRenderResponse = {
  schemaVersion: 1,
  selection: { language: 'go', framework: 'go_generic', method: 'sdk', environment: 'docker', platform: 'linux_amd64' },
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
  },
  secretPlaceholders: placeholders,
  steps: [
    {
      id: 'configure',
      type: 'configure',
      titleKey: 'instrumentation.step.configure',
      executionLocationKey: 'instrumentation.location.application_environment',
      snippets: [snippet]
    }
  ]
};
