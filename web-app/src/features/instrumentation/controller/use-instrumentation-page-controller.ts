/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useBeforeUnload, useNavigate } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';

import {
  detectInstrumentationSignals,
  loadInstrumentationCatalog,
  loadIntakeProfiles
} from '../api/instrumentation-api';
import { buildDetectionRequest, buildQueryJump, type InstrumentationDraft } from '../model/instrumentation-flow';
import type { DetectionResponse, Signal } from '../model/instrumentation-v2-contract';
import { instrumentationTokenCapability } from '../model/instrumentation-token-capability';
import { buildFlowReadiness } from './instrumentation-flow-readiness';
import { useDraftActions, useGuideActions } from './instrumentation-controller-actions';
import { useInstrumentationControllerState } from './instrumentation-controller-state';
import { useInstrumentationInitialization } from './use-instrumentation-initialization';
import { useInstrumentationProfile } from './use-instrumentation-profile';

const keys = {
  catalog: ['instrumentation', 'catalog'] as const,
  profiles: ['instrumentation', 'intake-profiles'] as const
};

export function useInstrumentationPageController() {
  const navigate = useNavigate();
  const session = useSession().session;
  const tokenCapability = instrumentationTokenCapability(session?.roles ?? []);
  const { catalogQuery, profilesQuery } = useInstrumentationQueries();
  const initialization = useInstrumentationInitialization(catalogQuery, profilesQuery);
  const state = useInstrumentationControllerState();
  const { generationRef, startedAtRef, timerRef } = useInstrumentationFlowLifetime();

  useDefaultProfile(profilesQuery.data?.defaultProfileId, state.setDraft);

  const draftActions = useDraftActions(
    state,
    catalogQuery.data,
    profilesQuery.data?.defaultProfileId,
    startedAtRef,
    timerRef,
    generationRef
  );
  const guideActions = useGuideActions(state, generationRef, startedAtRef);
  const profile = useInstrumentationProfile(
    state,
    generationRef,
    profilesQuery.data?.profiles,
    session?.workspaceId ?? undefined,
    tokenCapability.canGenerateToken
  );
  const detect = useDetection(
    state.draft,
    state.setDetection,
    state.setDetecting,
    state.setDetectionError,
    startedAtRef,
    timerRef,
    generationRef
  );
  const openQuery = useOpenQuery(state.detection, navigate, state.tokenAcknowledgementRequiredRef);
  const readiness = buildFlowReadiness(state, catalogQuery.data, initialization.profilesState, profile.selected);
  useProtectUnacknowledgedToken(state.tokenAcknowledgementRequired);

  return {
    ...state,
    catalog: catalogQuery.data,
    catalogState: initialization.catalogState,
    profiles: profilesQuery.data,
    profilesState: initialization.profilesState,
    initializationRetrying: initialization.initializationRetrying,
    retryInitialization: initialization.retryInitialization,
    ...draftActions,
    ...guideActions,
    ...profile.tokenActions,
    setStage: (stage: Parameters<typeof state.setStage>[0]) => {
      if (!state.tokenAcknowledgementRequiredRef.current) state.setStage(stage);
    },
    acknowledgeGeneratedToken: () => state.setTokenAcknowledgementRequired(false),
    canGenerateToken: profile.canGenerateToken,
    requiresToken: profile.requiresToken,
    detect,
    openQuery,
    ...readiness
  };
}

function useProtectUnacknowledgedToken(required: boolean) {
  useBeforeUnload(
    useCallback(
      event => {
        if (!required) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [required]
    )
  );
}

function useInstrumentationFlowLifetime() {
  const startedAtRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);
  const generationRef = useRef(0);
  useControllerLifetime(generationRef, timerRef);
  return { generationRef, startedAtRef, timerRef };
}

function useControllerLifetime(generationRef: React.RefObject<number>, timerRef: React.RefObject<number | undefined>) {
  useEffect(
    () => () => {
      // Token state is destroyed with this controller and is never persisted.
      generationRef.current += 1;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [generationRef, timerRef]
  );
}

function useOpenQuery(
  detection: DetectionResponse | undefined,
  navigate: ReturnType<typeof useNavigate>,
  tokenAcknowledgementRequiredRef: React.RefObject<boolean>
) {
  return useCallback(
    (signal: Signal) => {
      if (tokenAcknowledgementRequiredRef.current) return;
      const jump = detection?.queryJumps.find(item => item.signal === signal);
      if (jump?.enabled) void navigate(buildQueryJump(jump.signal, jump.context));
    },
    [detection, navigate, tokenAcknowledgementRequiredRef]
  );
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
