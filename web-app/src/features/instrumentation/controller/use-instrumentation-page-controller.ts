/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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
import { useBeforeUnload, useNavigate } from 'react-router-dom';

import { useSession } from '@/core/auth/session-context';
import { monitorCapabilities } from '@/features/monitor';
import { applicationRoutePaths, buildMonitorCreatePath, monitorRoutePaths } from '@/shared/navigation/app-paths';

import { loadInstrumentationCatalog, loadIntakeProfiles } from '../api/instrumentation-api';
import { buildQueryJump, type InstrumentationDraft } from '../model/instrumentation-flow';
import type { DetectionResponse, Signal } from '../model/instrumentation-v2-contract';
import { instrumentationTokenCapability } from '../model/instrumentation-token-capability';
import { buildFlowReadiness } from './instrumentation-flow-readiness';
import { useDraftActions, useGuideActions } from './instrumentation-controller-actions';
import { useInstrumentationControllerState } from './instrumentation-controller-state';
import { useInstrumentationInitialization } from './use-instrumentation-initialization';
import { useInstrumentationProfile } from './use-instrumentation-profile';
import { useInstrumentationDetection } from './use-instrumentation-detection';

const keys = {
  catalog: ['instrumentation', 'catalog'] as const,
  profiles: ['instrumentation', 'intake-profiles'] as const
};

export function useInstrumentationPageController() {
  const navigate = useNavigate();
  const session = useSession().session;
  const tokenCapability = instrumentationTokenCapability(session?.roles ?? []);
  const canCreateMonitor = monitorCapabilities(session?.roles ?? []).canWrite;
  const { catalogQuery, profilesQuery } = useInstrumentationQueries();
  const initialization = useInstrumentationInitialization(catalogQuery, profilesQuery);
  const state = useInstrumentationControllerState();
  const lifetime = useInstrumentationFlowLifetime();
  const { generationRef, startedAtRef, timerRef } = lifetime;

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
  const detection = useInstrumentationDetection(state, lifetime);
  const openQuery = useOpenQuery(state.detection, navigate, state.tokenAcknowledgementRequiredRef);
  const readiness = buildFlowReadiness(state, catalogQuery.data, initialization.profilesState, profile.selected);
  useProtectUnacknowledgedToken(state.tokenAcknowledgementRequired);

  return {
    ...state,
    canCreateMonitor,
    agentlessTarget: canCreateMonitor
      ? buildMonitorCreatePath({ returnTo: applicationRoutePaths.instrumentation })
      : monitorRoutePaths.list,
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
    ...detection,
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

function useControllerLifetime(
  generationRef: React.MutableRefObject<number>,
  timerRef: React.MutableRefObject<number | undefined>
) {
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
  tokenAcknowledgementRequiredRef: React.MutableRefObject<boolean>
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
