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

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type {
  GuideSnippet,
  GuideRenderRequest,
  GuideRenderResponse,
  InstrumentationEnvironment,
  InstrumentationFramework,
  InstrumentationLanguage,
  InstrumentationMethod,
  InstrumentationPlatform
} from '../api/instrumentation-contract';
import { loadInstrumentationCatalog, renderInstrumentationGuide } from '../api/instrumentation-api';
import { loadInstrumentationCollectors } from '../api/collector-api';
import {
  buildGuideRequest,
  createFlowDraft,
  materializeGuideSnippet,
  selectCatalogFramework,
  selectCatalogLanguage,
  selectCatalogMethod,
  selectFlowEnvironment,
  selectFlowPlatform,
  updateFlowContext,
  type FlowContextField,
  type FlowStage
} from '../model/instrumentation-flow';

export function useInstrumentationSetup() {
  const catalogQuery = useQuery({
    queryKey: ['instrumentation', 'catalog', 1],
    queryFn: ({ signal }) => loadInstrumentationCatalog(signal)
  });
  const collectorsQuery = useQuery({
    queryKey: ['instrumentation', 'collectors'],
    queryFn: ({ signal }) => loadInstrumentationCollectors(signal)
  });
  const [stage, setStage] = useState<FlowStage>(1);
  const [draft, setDraft] = useState(createFlowDraft);
  const [token, setToken] = useState('');
  const guideMutation = useMutation<GuideRenderResponse, Error, GuideRenderRequest>({
    mutationFn: request => renderInstrumentationGuide(request)
  });
  const invalidateGuide = () => guideMutation.reset();
  const setEnvironment = (value: InstrumentationEnvironment) => {
    if (!catalogQuery.data) return;
    const catalog = catalogQuery.data;
    setDraft(current => selectFlowEnvironment(current, catalog, value));
    invalidateGuide();
  };
  const setPlatform = (value: InstrumentationPlatform) => {
    if (!catalogQuery.data) return;
    const catalog = catalogQuery.data;
    setDraft(current => selectFlowPlatform(current, catalog, value));
    invalidateGuide();
  };
  const setLanguage = (value: InstrumentationLanguage) => {
    if (!catalogQuery.data) return;
    const catalog = catalogQuery.data;
    setDraft(current => selectCatalogLanguage(current, catalog, value));
    invalidateGuide();
  };
  const setFramework = (value: InstrumentationFramework) => {
    if (!catalogQuery.data) return;
    const catalog = catalogQuery.data;
    setDraft(current => selectCatalogFramework(current, catalog, value));
    invalidateGuide();
  };
  const setMethod = (value: InstrumentationMethod) => {
    if (!catalogQuery.data) return;
    const catalog = catalogQuery.data;
    setDraft(current => selectCatalogMethod(current, catalog, value));
    invalidateGuide();
  };
  const setContext = (field: FlowContextField, value: string) => {
    setDraft(current => updateFlowContext(current, field, value));
    invalidateGuide();
  };
  const renderGuide = async () => {
    const collector = collectorsQuery.data?.find(item => item.collectorId === draft.collectorId);
    if (!collector) throw new Error('Selected Collector is unavailable');
    const guide = await guideMutation.mutateAsync(buildGuideRequest(draft, collector));
    setStage(4);
    return guide;
  };
  const copySnippet = async (snippet: GuideSnippet) => {
    if (!guideMutation.data) throw new Error('Guide is unavailable');
    const content = materializeGuideSnippet(snippet, guideMutation.data, token);
    await navigator.clipboard.writeText(content);
  };

  return {
    stage, setStage, draft,
    catalog: catalogQuery.data, catalogPending: catalogQuery.isPending, catalogError: catalogQuery.isError,
    retryCatalog: catalogQuery.refetch,
    collectors: collectorsQuery.data ?? [], collectorsPending: collectorsQuery.isPending,
    collectorsError: collectorsQuery.isError, retryCollectors: collectorsQuery.refetch,
    token, setToken,
    guide: guideMutation.data, guidePending: guideMutation.isPending, guideError: guideMutation.isError,
    setEnvironment, setPlatform, setLanguage, setFramework, setMethod, setContext,
    renderGuide, copySnippet, clearGuide: invalidateGuide
  };
}

export type InstrumentationSetupController = ReturnType<typeof useInstrumentationSetup>;
