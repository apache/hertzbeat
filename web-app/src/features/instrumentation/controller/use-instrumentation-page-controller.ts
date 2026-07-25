/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  detectInstrumentationSignals,
  loadInstrumentationCatalog,
  loadIntakeProfiles
} from '../api/instrumentation-api';
import {
  buildDetectionRequest,
  buildQueryJump,
  draftReady,
  selectedRecipePlatforms,
  type InstrumentationDraft
} from '../model/instrumentation-flow';
import type { DetectionResponse, Signal } from '../model/instrumentation-v2-contract';
import { useDraftActions, useGuideActions } from './instrumentation-controller-actions';
import { useInstrumentationControllerState } from './instrumentation-controller-state';
import { useInstrumentationTokenActions } from './instrumentation-token-actions';

const keys = {
  catalog: ['instrumentation', 'catalog'] as const,
  profiles: ['instrumentation', 'intake-profiles'] as const
};

export function useInstrumentationPageController() {
  const navigate = useNavigate();
  const { catalogQuery, profilesQuery } = useInstrumentationQueries();
  const state = useInstrumentationControllerState();
  const startedAtRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);
  const generationRef = useRef(0);

  useDefaultProfile(profilesQuery.data?.defaultProfileId, state.setDraft);
  useEffect(
    () => () => {
      // Token state is destroyed with this controller and is never persisted.
      generationRef.current += 1;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  const draftActions = useDraftActions(
    state,
    catalogQuery.data,
    profilesQuery.data?.defaultProfileId,
    startedAtRef,
    timerRef,
    generationRef
  );
  const guideActions = useGuideActions(state, generationRef, startedAtRef);
  const tokenActions = useInstrumentationTokenActions(state, generationRef);
  const detect = useDetection(
    state.draft,
    state.setDetection,
    state.setDetecting,
    state.setDetectionError,
    startedAtRef,
    timerRef,
    generationRef
  );
  const openQuery = useCallback(
    (signal: Signal) => {
      const jump = state.detection?.queryJumps.find(item => item.signal === signal);
      if (jump?.enabled) void navigate(buildQueryJump(jump.signal, jump.context));
    },
    [navigate, state.detection]
  );

  return {
    ...state,
    catalog: catalogQuery.data,
    catalogState: queryState(catalogQuery),
    profiles: profilesQuery.data,
    profilesState: queryState(profilesQuery),
    ...draftActions,
    ...guideActions,
    ...tokenActions,
    detect,
    openQuery,
    hasFlowBack: state.stage !== 'source' || Boolean(state.draft.sourceId),
    canContinueSource: Boolean(state.draft.recipeId),
    platformOptions: catalogQuery.data ? selectedRecipePlatforms(catalogQuery.data, state.draft) : [],
    // Every advertised intake profile requires Authorization. Rendering only
    // after generation avoids presenting copy-disabled commands as ready.
    canRender: draftReady(state.draft) && Boolean(state.token.trim())
  };
}

function useInstrumentationQueries() {
  const catalogQuery = useQuery({
    queryKey: keys.catalog,
    queryFn: ({ signal }) => loadInstrumentationCatalog(signal)
  });
  const profilesQuery = useQuery({
    queryKey: keys.profiles,
    queryFn: ({ signal }) => loadIntakeProfiles(signal)
  });
  return { catalogQuery, profilesQuery };
}

function useDefaultProfile(
  defaultId: string | undefined,
  setDraft: (value: React.SetStateAction<InstrumentationDraft>) => void
) {
  useEffect(() => {
    if (!defaultId) return;
    setDraft(current => (current.intakeProfileId ? current : { ...current, intakeProfileId: defaultId }));
  }, [defaultId, setDraft]);
}

function useDetection(
  draft: InstrumentationDraft,
  setDetection: (value: DetectionResponse | undefined) => void,
  setDetecting: (value: boolean) => void,
  setDetectionError: (value: boolean) => void,
  startedAtRef: React.RefObject<number | undefined>,
  timerRef: React.RefObject<number | undefined>,
  generationRef: React.RefObject<number>
) {
  return useCallback(
    async function runDetection() {
      const currentGeneration = generationRef.current;
      const start = startedAtRef.current;
      if (start === undefined) {
        setDetecting(false);
        setDetectionError(true);
        setDetection(undefined);
        return;
      }
      setDetecting(true);
      setDetectionError(false);
      try {
        const response = await detectInstrumentationSignals(buildDetectionRequest(draft, start));
        if (generationRef.current !== currentGeneration) return;
        setDetection(response);
        if (response.polling.decision === 'continue_polling' && Date.now() < response.polling.deadlineAt) {
          const remaining = response.polling.deadlineAt - Date.now();
          const delay = response.polling.pollAfterMs;
          if (delay && delay <= remaining) {
            timerRef.current = window.setTimeout(() => void runDetection(), delay);
          } else setDetecting(false);
        } else {
          setDetecting(false);
        }
      } catch {
        if (generationRef.current !== currentGeneration) return;
        setDetecting(false);
        setDetectionError(true);
        setDetection(undefined);
      }
    },
    [draft, generationRef, setDetection, setDetecting, setDetectionError, startedAtRef, timerRef]
  );
}

function queryState(query: { isPending: boolean; error: unknown }) {
  if (query.isPending) return 'loading' as const;
  if (query.error) return 'error' as const;
  return 'ready' as const;
}
