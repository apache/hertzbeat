/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { CatalogResponse, OfficialComponent } from '../model/instrumentation-contract';
import { createFlowDraft, selectCatalogLanguage } from '../model/instrumentation-flow';
import { useInstrumentationProgressController } from './use-instrumentation-progress-controller';

describe('instrumentation progress controller', () => {
  it('uses Router history for completed selection stages and restores them on POP', async () => {
    const routed = renderProgress('/observability/integration');
    const initial = createFlowDraft();

    act(() => routed.current().setStage(2, initial));
    await waitFor(() => expect(routed.router.state.location.search).toContain('instrumentationStage=2'));
    const selected = selectCatalogLanguage(initial, catalog, 'go');
    act(() => routed.current().persistDraft(selected));
    await waitFor(() => expect(routed.router.state.location.search).toContain('instrumentationLanguage=go'));
    act(() => routed.current().setStage(3, selected));
    await waitFor(() => expect(routed.current().stage).toBe(3));

    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().stage).toBe(2));
    expect(routed.current().restored.draft.selection?.language).toBe('go');
  });

  it('clears a mismatched persisted selection without writing any secret state', async () => {
    const routed = renderProgress(
      '/observability/integration?instrumentationSchemaVersion=2&instrumentationStage=3' +
        '&instrumentationLanguage=go&instrumentationFramework=go_generic&instrumentationMethod=sdk'
    );
    expect(routed.current().restored.mismatch).toBe(true);

    act(() => routed.current().clearMismatch(createFlowDraft()));

    await waitFor(() => expect(routed.router.state.location.search).toContain('instrumentationStage=1'));
    expect(routed.router.state.location.search).not.toMatch(/instrumentationLanguage|token|secret/i);
  });
});

function renderProgress(entry: string) {
  let value: ReturnType<typeof useInstrumentationProgressController> | undefined;
  function Probe() {
    value = useInstrumentationProgressController({
      collectorId: 'collector-east',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod'
    });
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/observability/integration',
        element: <Probe />
      }
    ],
    { initialEntries: [entry] }
  );
  render(<RouterProvider router={router} />);
  return {
    router,
    current: () => {
      if (!value) throw new Error('progress controller was not mounted');
      return value;
    }
  };
}

const component: OfficialComponent = {
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
};
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
              component
            }
          ]
        }
      ]
    }
  ]
};
