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
import { useCallback, useEffect, useRef } from 'react';

import { mergeQueryContext, useQueryContextOptional, type QueryContext } from '@/shared/query-context';

import { collectorReadFailureKind, loadInstrumentationCollectors } from '../api/collector-api';
import { INSTRUMENTATION_SCHEMA_VERSION, type GuideSnippet } from '../model/instrumentation-contract';
import type { CollectorTarget, InstrumentationCollectorsState } from '../model/instrumentation-collector';
import { instrumentationQueryKeys } from '../api/instrumentation-query-keys';
import { validateFlowContext, type FlowStage } from '../model/instrumentation-flow';
import { instrumentationProgressIdentity } from '../model/instrumentation-progress';
import { buildInstrumentationSelectionOptions } from './instrumentation-selection-options';
import { useInstrumentationCatalogController } from './use-instrumentation-catalog-controller';
import { useInstrumentationContractRefresh } from './use-instrumentation-contract-refresh';
import { useInstrumentationGuideController } from './use-instrumentation-guide-controller';
import { useInstrumentationPageDetection } from './use-instrumentation-page-detection';
import { useInstrumentationProgressController } from './use-instrumentation-progress-controller';

export function useInstrumentationPageController() {
  const sharedContext = useQueryContextOptional();
  const progress = useInstrumentationProgressController(sharedContext?.context ?? {});
  const catalog = useInstrumentationCatalogController(progress.restored.draft);
  const collectorsQuery = useInstrumentationCollectors();
  const guide = useInstrumentationGuideController(catalog.draft, collectorsQuery.data ?? []);
  const selectionOptions = buildInstrumentationSelectionOptions(catalog.catalog, catalog.draft);
  const handleContractError = useInstrumentationContractRefresh({
    clearSelection: catalog.clearSelection,
    clearGuide: guide.clearContractState,
    resetFlow: () => progress.clearMismatch(catalog.draft),
    refreshCatalog: async () => void (await catalog.retry())
  });

  useRestoreInstrumentationDraft(catalog.restoreDraft, progress.restored.draft);
  usePersistInstrumentationDraft(catalog.draft, progress.persistDraft);
  useInstrumentationMismatchRecovery(
    progress.restored.mismatch,
    progress.search,
    catalog.draft,
    catalog.clearSelection,
    guide.clearContractState,
    progress.clearMismatch,
    catalog.retry
  );
  const actions = useInstrumentationSetupActions(catalog, guide, progress, sharedContext, handleContractError);
  const setup = buildInstrumentationSetup(catalog, collectorsQuery, guide, progress, selectionOptions, actions);
  const detection = useInstrumentationPageDetection(catalog.draft, handleContractError);
  return { setup, detection };
}

function useInstrumentationCollectors() {
  return useQuery({
    queryKey: instrumentationQueryKeys.collectors(),
    queryFn: ({ signal }) => loadInstrumentationCollectors(signal)
  });
}

type CatalogController = ReturnType<typeof useInstrumentationCatalogController>;
type GuideController = ReturnType<typeof useInstrumentationGuideController>;
type ProgressController = ReturnType<typeof useInstrumentationProgressController>;
type SharedContext = ReturnType<typeof useQueryContextOptional>;
type ContractErrorHandler = ReturnType<typeof useInstrumentationContractRefresh>;

function useInstrumentationSetupActions(
  catalog: CatalogController,
  guide: GuideController,
  progress: ProgressController,
  sharedContext: SharedContext,
  handleContractError: ContractErrorHandler
) {
  const renderGeneration = useRef(0);
  const setStage = useCallback(
    (stage: FlowStage) => {
      if (stage < 4) {
        renderGeneration.current += 1;
        guide.reset();
      }
      progress.setStage(stage, catalog.draft);
    },
    [catalog.draft, guide, progress]
  );
  const renderGuide = useCallback(async () => {
    const generation = renderGeneration.current + 1;
    renderGeneration.current = generation;
    try {
      const rendered = await guide.render();
      if (renderGeneration.current === generation) setStage(4);
      return rendered;
    } catch (error: unknown) {
      await handleContractError(error);
      throw error;
    }
  }, [guide, handleContractError, setStage]);
  const copySnippet = async (snippet: GuideSnippet) => {
    await navigator.clipboard.writeText(guide.materializeSnippet(snippet));
  };
  const setContext = (field: Parameters<typeof catalog.setContext>[0], value: string) => {
    catalog.setContext(field, value);
    const sharedField = instrumentationContextField(field);
    if (sharedField && sharedContext) {
      sharedContext.replace(mergeQueryContext(sharedContext.context, { [sharedField]: value }));
    }
  };

  return { setStage, setContext, renderGuide, copySnippet, handleContractError };
}

function buildInstrumentationSetup(
  catalog: CatalogController,
  collectorsQuery: ReturnType<typeof useInstrumentationCollectors>,
  guide: GuideController,
  progress: ProgressController,
  selectionOptions: ReturnType<typeof buildInstrumentationSelectionOptions>,
  actions: ReturnType<typeof useInstrumentationSetupActions>
) {
  return {
    schemaVersion: INSTRUMENTATION_SCHEMA_VERSION,
    stage: progress.stage,
    setStage: actions.setStage,
    draft: catalog.draft,
    selectionOptions,
    contextMissing: validateFlowContext(catalog.draft),
    catalog: catalog.catalog,
    catalogPending: catalog.state.status === 'loading',
    catalogError: catalog.state.status === 'error',
    retryCatalog: catalog.retry,
    collectors: collectorsQuery.data ?? [],
    collectorsState: instrumentationCollectorsState(collectorsQuery.error, collectorsQuery.isPending),
    retryCollectors: collectorsQuery.refetch,
    token: guide.token,
    setToken: guide.setToken,
    transientTarget: guide.transientTarget,
    setTransientTarget: (target: CollectorTarget | undefined) => guide.setTransientTarget(target),
    guide: guide.guide,
    guideState: guide.state,
    guidePending: guide.state.status === 'rendering',
    guideError: guide.state.status === 'error',
    setEnvironment: catalog.setEnvironment,
    setPlatform: catalog.setPlatform,
    setLanguage: catalog.setLanguage,
    setFramework: catalog.setFramework,
    setMethod: catalog.setMethod,
    setContext: actions.setContext,
    renderGuide: actions.renderGuide,
    copySnippet: actions.copySnippet,
    clearGuide: guide.clearContractState,
    handleContractError: actions.handleContractError
  };
}

function instrumentationCollectorsState(error: unknown, isPending: boolean): InstrumentationCollectorsState {
  if (isPending) return { status: 'loading' };
  if (error) return { status: collectorReadFailureKind(error) };
  return { status: 'ready' };
}

function useRestoreInstrumentationDraft(
  restoreDraft: CatalogController['restoreDraft'],
  restoredDraft: ProgressController['restored']['draft']
) {
  useEffect(() => {
    restoreDraft(restoredDraft);
  }, [restoreDraft, restoredDraft]);
}

function usePersistInstrumentationDraft(
  draft: CatalogController['draft'],
  persistDraft: ProgressController['persistDraft']
) {
  const persistedIdentity = useRef<string | undefined>(undefined);
  const identity = instrumentationProgressIdentity(draft);
  useEffect(() => {
    if (persistedIdentity.current === identity) return;
    persistedIdentity.current = identity;
    persistDraft(draft);
  }, [draft, identity, persistDraft]);
}

function useInstrumentationMismatchRecovery(
  mismatch: boolean,
  search: string,
  draft: CatalogController['draft'],
  clearSelection: CatalogController['clearSelection'],
  clearContractState: GuideController['clearContractState'],
  clearMismatch: ProgressController['clearMismatch'],
  retry: CatalogController['retry']
) {
  const handledMismatch = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!mismatch || handledMismatch.current === search) return;
    handledMismatch.current = search;
    clearSelection();
    clearContractState();
    clearMismatch(draft);
    void retry();
  }, [clearContractState, clearMismatch, clearSelection, draft, mismatch, retry, search]);
}

function instrumentationContextField(field: string): keyof QueryContext | undefined {
  if (field === 'collectorId' || field === 'serviceName' || field === 'serviceNamespace') return field;
  return field === 'serviceEnvironment' ? 'environment' : undefined;
}
