/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { IntakeProfilesResponse } from '../model/instrumentation-v2-contract';
import { profileRequiresToken } from '../model/intake-profile';
import type { useInstrumentationControllerState } from './instrumentation-controller-state';
import { useInstrumentationTokenActions } from './instrumentation-token-actions';

export function useInstrumentationProfile(
  state: ReturnType<typeof useInstrumentationControllerState>,
  generationRef: React.RefObject<number>,
  profiles: IntakeProfilesResponse['profiles'] | undefined,
  workspaceId: string | undefined,
  tokenCapable: boolean
) {
  const selected = profiles?.find(profile => profile.id === state.draft.intakeProfileId);
  const requiresToken = profileRequiresToken(selected);
  const tokenActions = useInstrumentationTokenActions(
    state,
    generationRef,
    tokenCapable,
    requiresToken,
    selected,
    workspaceId
  );
  return { canGenerateToken: tokenCapable && requiresToken, requiresToken, selected, tokenActions };
}
