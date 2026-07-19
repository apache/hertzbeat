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
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type {
  CatalogResponse,
  InstrumentationEnvironment,
  InstrumentationFramework,
  InstrumentationLanguage,
  InstrumentationMethod,
  InstrumentationPlatform
} from '../model/instrumentation-contract';
import { loadInstrumentationCatalog } from '../api/instrumentation-api';
import { instrumentationQueryKeys } from '../api/instrumentation-query-keys';
import {
  createFlowDraft,
  clearFlowSelection,
  reconcileFlowCatalog,
  selectCatalogFramework,
  selectCatalogLanguage,
  selectCatalogMethod,
  selectFlowEnvironment,
  selectFlowPlatform,
  updateFlowContext,
  type FlowContextField,
  type InstrumentationFlowDraft
} from '../model/instrumentation-flow';

export type InstrumentationCatalogState =
  { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; catalog: CatalogResponse };

export function useInstrumentationCatalogController(initialDraft: InstrumentationFlowDraft = createFlowDraft()) {
  const query = useQuery({
    queryKey: instrumentationQueryKeys.catalog(),
    queryFn: ({ signal }) => loadInstrumentationCatalog(signal)
  });
  const [draft, setDraft] = useState(initialDraft);
  useCatalogReconciliation(query.data, setDraft);
  const selectionActions = useCatalogSelectionActions(query.data, setDraft);
  const draftActions = useCatalogDraftActions(setDraft);

  return {
    state: catalogState(query.data, query.error, query.isPending),
    draft,
    catalog: query.data,
    retry: query.refetch,
    ...selectionActions,
    ...draftActions
  };
}

type DraftSetter = Dispatch<SetStateAction<InstrumentationFlowDraft>>;

function useCatalogReconciliation(catalog: CatalogResponse | undefined, setDraft: DraftSetter) {
  const previousCatalog = useRef<CatalogResponse | undefined>(undefined);
  useEffect(() => {
    const refreshedCatalog = catalog;
    if (!refreshedCatalog || previousCatalog.current === refreshedCatalog) return;
    previousCatalog.current = refreshedCatalog;
    setDraft(current => reconcileFlowCatalog(current, refreshedCatalog));
  }, [catalog, setDraft]);
}

function useCatalogSelectionActions(catalog: CatalogResponse | undefined, setDraft: DraftSetter) {
  const updateFromCatalog = useCallback(
    (update: CatalogDraftUpdate) => {
      if (!catalog) return;
      setDraft(current => update(current, catalog));
    },
    [catalog, setDraft]
  );
  const setEnvironment = useCallback(
    (value: InstrumentationEnvironment) => {
      updateFromCatalog((current, catalog) => selectFlowEnvironment(current, catalog, value));
    },
    [updateFromCatalog]
  );
  const setPlatform = useCallback(
    (value: InstrumentationPlatform) => {
      updateFromCatalog((current, catalog) => selectFlowPlatform(current, catalog, value));
    },
    [updateFromCatalog]
  );
  const setLanguage = useCallback(
    (value: InstrumentationLanguage) => {
      updateFromCatalog((current, catalog) => selectCatalogLanguage(current, catalog, value));
    },
    [updateFromCatalog]
  );
  const setFramework = useCallback(
    (value: InstrumentationFramework) => {
      updateFromCatalog((current, catalog) => selectCatalogFramework(current, catalog, value));
    },
    [updateFromCatalog]
  );
  const setMethod = useCallback(
    (value: InstrumentationMethod) => {
      updateFromCatalog((current, catalog) => selectCatalogMethod(current, catalog, value));
    },
    [updateFromCatalog]
  );
  return { setEnvironment, setPlatform, setLanguage, setFramework, setMethod };
}

function useCatalogDraftActions(setDraft: DraftSetter) {
  const setContext = useCallback(
    (field: FlowContextField, value: string) => {
      setDraft(current => updateFlowContext(current, field, value));
    },
    [setDraft]
  );
  const clearSelection = useCallback(() => setDraft(clearFlowSelection), [setDraft]);
  const restoreDraft = useCallback(
    (restored: InstrumentationFlowDraft) => {
      setDraft(current => (sameInstrumentationDraft(current, restored) ? current : restored));
    },
    [setDraft]
  );

  return {
    setContext,
    clearSelection,
    restoreDraft
  };
}

function sameInstrumentationDraft(left: InstrumentationFlowDraft, right: InstrumentationFlowDraft) {
  return sameDraftContext(left, right) && sameDraftSelection(left.selection, right.selection);
}

function sameDraftContext(left: InstrumentationFlowDraft, right: InstrumentationFlowDraft) {
  return (
    left.environment === right.environment &&
    left.platform === right.platform &&
    left.collectorId === right.collectorId &&
    left.serviceName === right.serviceName &&
    left.serviceNamespace === right.serviceNamespace &&
    left.serviceEnvironment === right.serviceEnvironment
  );
}

function sameDraftSelection(left: InstrumentationFlowDraft['selection'], right: InstrumentationFlowDraft['selection']) {
  if (!left || !right) return left === right;
  return (
    left.language === right.language &&
    left.framework === right.framework &&
    left.method === right.method &&
    left.environment === right.environment &&
    left.platform === right.platform
  );
}

type CatalogDraftUpdate = (draft: InstrumentationFlowDraft, catalog: CatalogResponse) => InstrumentationFlowDraft;

function catalogState(
  catalog: CatalogResponse | undefined,
  error: Error | null,
  pending: boolean
): InstrumentationCatalogState {
  if (pending) return { status: 'loading' };
  if (error) return { status: 'error', error };
  if (!catalog) return { status: 'error', error: new Error('Instrumentation catalog was unavailable') };
  return { status: 'ready', catalog };
}
