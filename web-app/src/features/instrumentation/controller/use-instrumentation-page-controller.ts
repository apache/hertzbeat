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
import { useNavigate } from 'react-router-dom';

import { mergeQueryContext, useQueryContextOptional, type QueryContext } from '@/shared/query-context';

import { loadInstrumentationCollectors } from '../api/collector-api';
import {
  INSTRUMENTATION_SCHEMA_VERSION,
  type CollectorTarget,
  type GuideSnippet
} from '../api/instrumentation-contract';
import { instrumentationQueryKeys } from '../api/instrumentation-query-keys';
import {
  availableEnvironments,
  availablePlatforms,
  compatibleMethods,
  validateFlowContext,
  type FlowStage,
  type InstrumentationFlowDraft
} from '../model/instrumentation-flow';
import { buildDetectionRequest } from '../model/instrumentation-requests';
import { useInstrumentationCatalogController } from './use-instrumentation-catalog-controller';
import { useInstrumentationContractRefresh } from './use-instrumentation-contract-refresh';
import { useInstrumentationDetectionController } from './use-instrumentation-detection-controller';
import { useInstrumentationGuideController } from './use-instrumentation-guide-controller';
import { useInstrumentationProgressController } from './use-instrumentation-progress-controller';

export function useInstrumentationPageController() {
  const sharedContext = useQueryContextOptional();
  const progress = useInstrumentationProgressController(sharedContext?.context ?? {});
  const catalog = useInstrumentationCatalogController(progress.restored.draft);
  const collectorsQuery = useQuery({
    queryKey: instrumentationQueryKeys.collectors(),
    queryFn: ({ signal }) => loadInstrumentationCollectors(signal)
  });
  const guide = useInstrumentationGuideController(catalog.draft, collectorsQuery.data ?? []);
  const selectionOptions = buildSelectionOptions(catalog.catalog, catalog.draft);
  const setStage = useCallback((stage: FlowStage) => {
    progress.setStage(stage, catalog.draft);
  }, [catalog.draft, progress]);
  const handleContractError = useInstrumentationContractRefresh({
    clearSelection: catalog.clearSelection,
    clearGuide: guide.clearContractState,
    resetFlow: () => progress.clearMismatch(catalog.draft),
    refreshCatalog: async () => void await catalog.retry()
  });

  useRestoredInstrumentationDraft(catalog, guide, progress);

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
  const setContext = (field: Parameters<typeof catalog.setContext>[0], value: string) => {
    catalog.setContext(field, value);
    const sharedField = instrumentationContextField(field);
    if (sharedField && sharedContext) {
      sharedContext.replace(mergeQueryContext(sharedContext.context, { [sharedField]: value }));
    }
  };
  const setup = {
    schemaVersion: INSTRUMENTATION_SCHEMA_VERSION,
    stage: progress.stage,
    setStage,
    draft: catalog.draft,
    selectionOptions,
    contextMissing: validateFlowContext(catalog.draft),
    catalog: catalog.catalog,
    catalogPending: catalog.state.status === 'loading',
    catalogError: catalog.state.status === 'error',
    retryCatalog: catalog.retry,
    collectors: collectorsQuery.data ?? [],
    collectorsPending: collectorsQuery.isPending,
    collectorsError: collectorsQuery.isError,
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
    setContext,
    renderGuide,
    copySnippet,
    clearGuide: guide.clearContractState,
    handleContractError
  };
  const createDetectionRequest = useCallback(
    (startedAt: number) => buildDetectionRequest(catalog.draft, startedAt),
    [catalog.draft]
  );
  const navigate = useNavigate();
  const openPath = useCallback((path: string) => { void navigate(path); }, [navigate]);
  const detection = useInstrumentationDetectionController(createDetectionRequest, handleContractError, openPath);
  return { setup, detection };
}

function useRestoredInstrumentationDraft(
  catalog: ReturnType<typeof useInstrumentationCatalogController>,
  guide: ReturnType<typeof useInstrumentationGuideController>,
  progress: ReturnType<typeof useInstrumentationProgressController>
) {
  const handledMismatch = useRef<string | undefined>(undefined);
  useEffect(() => {
    catalog.restoreDraft(progress.restored.draft);
  }, [catalog, progress.restored.draft]);
  const persistedDraft = useRef<typeof catalog.draft | undefined>(undefined);
  useEffect(() => {
    if (persistedDraft.current === catalog.draft) return;
    persistedDraft.current = catalog.draft;
    progress.persistDraft(catalog.draft);
  }, [catalog.draft, progress]);
  useEffect(() => {
    if (!progress.restored.mismatch || handledMismatch.current === progress.search) return;
    handledMismatch.current = progress.search;
    catalog.clearSelection();
    guide.clearContractState();
    progress.clearMismatch(catalog.draft);
    void catalog.retry();
  }, [catalog, guide, progress]);
}

function instrumentationContextField(field: string): keyof QueryContext | undefined {
  if (field === 'collectorId' || field === 'serviceName' || field === 'serviceNamespace') return field;
  return field === 'serviceEnvironment' ? 'environment' : undefined;
}

function buildSelectionOptions(
  catalog: ReturnType<typeof useInstrumentationCatalogController>['catalog'],
  draft: InstrumentationFlowDraft
) {
  if (!catalog) {
    return { environments: [], platforms: [], languages: [], frameworks: [], methods: [], frameworkSelected: false };
  }
  const selectedLanguage = catalog.languages.find(item => item.language === draft.selection?.language);
  const selectedFramework = selectedLanguage?.frameworks.find(item => item.framework === draft.selection?.framework);
  const languages = catalog.languages.filter(language => language.frameworks.some(framework => (
    compatibleMethods(catalog, draft, language.language, framework.framework).length > 0
  )));
  const frameworks = selectedLanguage?.frameworks.filter(framework => (
    compatibleMethods(catalog, draft, selectedLanguage.language, framework.framework).length > 0
  )) ?? [];
  const methods = draft.selection
    ? compatibleMethods(catalog, draft, draft.selection.language, draft.selection.framework)
    : [];
  return {
    environments: availableEnvironments(catalog),
    platforms: availablePlatforms(catalog, draft.environment),
    languages,
    frameworks,
    methods,
    frameworkSelected: selectedFramework !== undefined
  };
}

export type InstrumentationPageController = ReturnType<typeof useInstrumentationPageController>;
export type InstrumentationSetupController = InstrumentationPageController['setup'];
