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

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useQueryContextOptional, type QueryContext } from '@/shared/query-context';

import {
  INSTRUMENTATION_SCHEMA_VERSION,
  type CollectorTarget,
  type GuideSnippet,
} from '../api/instrumentation-contract';
import { loadInstrumentationCollectors } from '../api/collector-api';
import { useInstrumentationCatalogController } from '../controller/use-instrumentation-catalog-controller';
import { useInstrumentationContractRefresh } from '../controller/use-instrumentation-contract-refresh';
import { useInstrumentationGuideController } from '../controller/use-instrumentation-guide-controller';
import type { FlowStage } from '../model/instrumentation-flow';

export function useInstrumentationSetup() {
  const sharedContext = useQueryContextOptional();
  const catalog = useInstrumentationCatalogController();
  const collectorsQuery = useQuery({
    queryKey: ['instrumentation', 'collectors'],
    queryFn: ({ signal }) => loadInstrumentationCollectors(signal)
  });
  const [stage, setStage] = useState<FlowStage>(1);
  const guide = useInstrumentationGuideController(catalog.draft, collectorsQuery.data ?? []);
  const handleContractError = useInstrumentationContractRefresh({
    clearSelection: catalog.clearSelection,
    clearGuide: guide.clearContractState,
    resetFlow: () => setStage(1),
    refreshCatalog: async () => void await catalog.retry()
  });
  const renderGuide = async () => {
    try {
      const rendered = await guide.render();
      setStage(4);
      return rendered;
    } catch (error: unknown) {
      await handleContractError(error);
      throw error;
    }
  };
  const copySnippet = async (snippet: GuideSnippet) => {
    await navigator.clipboard.writeText(guide.materializeSnippet(snippet));
  };
  const setTransientTarget = (target: CollectorTarget | undefined) => guide.setTransientTarget(target);
  const setContext = (field: Parameters<typeof catalog.setContext>[0], value: string) => {
    catalog.setContext(field, value);
    const sharedField = instrumentationContextField(field);
    if (sharedField) sharedContext?.update({ [sharedField]: value });
  };

  return {
    schemaVersion: INSTRUMENTATION_SCHEMA_VERSION,
    stage, setStage, draft: catalog.draft,
    catalog: catalog.catalog, catalogPending: catalog.state.status === 'loading',
    catalogError: catalog.state.status === 'error', retryCatalog: catalog.retry,
    collectors: collectorsQuery.data ?? [], collectorsPending: collectorsQuery.isPending,
    collectorsError: collectorsQuery.isError, retryCollectors: collectorsQuery.refetch,
    token: guide.token, setToken: guide.setToken,
    transientTarget: guide.transientTarget, setTransientTarget,
    guide: guide.guide, guideState: guide.state,
    guidePending: guide.state.status === 'rendering', guideError: guide.state.status === 'error',
    setEnvironment: catalog.setEnvironment, setPlatform: catalog.setPlatform,
    setLanguage: catalog.setLanguage, setFramework: catalog.setFramework,
    setMethod: catalog.setMethod, setContext,
    renderGuide, copySnippet, clearGuide: guide.clearContractState, handleContractError
  };
}

function instrumentationContextField(field: string): keyof QueryContext | undefined {
  if (field === 'collectorId' || field === 'serviceName' || field === 'serviceNamespace') return field;
  return field === 'serviceEnvironment' ? 'environment' : undefined;
}

export type InstrumentationSetupController = ReturnType<typeof useInstrumentationSetup>;
