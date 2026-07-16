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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  GuideRenderResponse,
  InstrumentationSelection,
  OfficialComponent
} from '../api/instrumentation-contract';
import type { InstrumentationFlowDraft } from '../model/instrumentation-flow';

const { renderInstrumentationGuide } = vi.hoisted(() => ({ renderInstrumentationGuide: vi.fn() }));
vi.mock('../api/instrumentation-api', () => ({ renderInstrumentationGuide }));

import { useInstrumentationGuideController } from './use-instrumentation-guide-controller';

afterEach(() => vi.restoreAllMocks());

describe('instrumentation guide controller', () => {
  it('fails closed until an explicit transient intake target is supplied', async () => {
    const { result } = renderGuideController();

    expect(result.current.state).toEqual({ status: 'unavailable', reason: 'collector_intake_unavailable' });
    await expect(result.current.render()).rejects.toThrow(/intake/i);
    expect(renderInstrumentationGuide).not.toHaveBeenCalled();
  });

  it('keeps the token in memory and substitutes only a returned copy value', async () => {
    renderInstrumentationGuide.mockResolvedValue(guide);
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderGuideController(client);

    act(() => result.current.setTransientTarget(target));
    act(() => result.current.setToken('runtime_only_token'));
    await act(async () => void await result.current.render());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    const request = renderInstrumentationGuide.mock.calls[0]?.[0];
    expect(JSON.stringify(request)).not.toContain('runtime_only_token');
    expect(result.current.materializeSnippet(guide.steps[0]!.snippets[0]!)).toContain('runtime_only_token');
    expect(result.current.guide?.steps.at(0)?.snippets.at(0)?.content).toContain('${HERTZBEAT_TOKEN}');
    expect(JSON.stringify(client.getMutationCache().getAll().map(item => item.state.variables)))
      .not.toContain('runtime_only_token');
    expect(window.location.href).not.toContain('runtime_only_token');
    expect(JSON.stringify(storageWrite.mock.calls)).not.toContain('runtime_only_token');
    expect(JSON.stringify(log.mock.calls)).not.toContain('runtime_only_token');
  });

  it('clears endpoint and token only when the selected Collector changes', async () => {
    renderInstrumentationGuide.mockResolvedValue(guide);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ currentDraft }) => useInstrumentationGuideController(currentDraft, [collector, collectorWest]),
      { wrapper, initialProps: { currentDraft: draft } }
    );
    act(() => result.current.setTransientTarget(target));
    act(() => result.current.setToken('collector_scoped_token'));
    await act(async () => void await result.current.render());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    rerender({ currentDraft: { ...draft, selection: { ...draft.selection!, method: 'ebpf' } } });
    await waitFor(() => expect(result.current.guide).toBeUndefined());
    expect(result.current.transientTarget).toEqual(target);
    expect(result.current.token).toBe('collector_scoped_token');

    rerender({ currentDraft: { ...draft, collectorId: 'collector-west' } });
    await waitFor(() => expect(result.current.transientTarget).toBeUndefined());
    expect(result.current.token).toBe('');
    expect(result.current.guide).toBeUndefined();
  });

  it('binds the in-memory token to the exact transient intake identity', () => {
    const { result } = renderGuideController();
    act(() => result.current.setTransientTarget(target));
    act(() => result.current.setToken('endpoint_scoped_token'));

    act(() => result.current.setTransientTarget({ ...target }));
    expect(result.current.token).toBe('endpoint_scoped_token');

    act(() => result.current.setTransientTarget({
      ...target, otlpHttpEndpoint: 'https://collector.internal:4318'
    }));
    expect(result.current.token).toBe('');
    expect(result.current.guide).toBeUndefined();
  });
});

function renderGuideController(client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useInstrumentationGuideController(draft, [collector]), { wrapper });
}

const selection: InstrumentationSelection = {
  language: 'go', framework: 'go_generic', method: 'sdk', environment: 'docker', platform: 'linux_amd64'
};
const draft: InstrumentationFlowDraft = {
  environment: 'docker', platform: 'linux_amd64',
  selection,
  collectorId: 'collector-east', serviceName: 'checkout-api', serviceNamespace: 'commerce',
  serviceEnvironment: 'prod'
};
const collector = {
  collectorId: 'collector-east', name: 'collector-east', address: '10.0.0.8', online: true,
  intake: { status: 'unavailable' as const }
};
const collectorWest = {
  ...collector, collectorId: 'collector-west', name: 'collector-west', address: '10.0.0.9'
};
const target = {
  collectorId: 'collector-east', otlpHttpEndpoint: 'http://collector.internal:4318',
  otlpGrpcEndpoint: 'http://collector.internal:4317', authorizationHeader: 'Authorization'
} as const;
const component: OfficialComponent = {
  name: 'OpenTelemetry Go SDK', sourceUrl: 'https://opentelemetry.io/', version: '1.43.0',
  versionPolicy: 'pinned', license: 'Apache-2.0', installationLocationKey: 'instrumentation.location.application_host',
  official: true, bundledWithHertzBeat: false, dependencies: [], artifacts: []
};
const guide: GuideRenderResponse = {
  schemaVersion: 1,
  selection,
  signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
  component,
  secretPlaceholders: {
    authorizationToken: { marker: '${HERTZBEAT_TOKEN}', valueFormat: 'url_unreserved', replacement: 'raw' }
  },
  steps: [{
    id: 'configure', type: 'configure', titleKey: 'instrumentation.step.configure',
    executionLocationKey: 'instrumentation.location.application_environment',
    snippets: [{
      id: 'otel-environment', language: 'bash', content: 'Authorization=Bearer%20${HERTZBEAT_TOKEN}',
      secretPlaceholders: ['authorizationToken']
    }]
  }]
};
