/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { draftReady, selectedRecipePlatforms } from '../model/instrumentation-flow';
import { profileCanRender } from '../model/intake-profile';
import {
  metadataAllowsConfiguration,
  type InstrumentationMetadataState
} from '../model/instrumentation-initialization';
import type { CatalogResponse, IntakeProfilesResponse } from '../model/instrumentation-v2-contract';
import type { InstrumentationControllerState } from './instrumentation-controller-state';

type IntakeProfile = IntakeProfilesResponse['profiles'][number];

export function buildFlowReadiness(
  state: InstrumentationControllerState,
  catalog: CatalogResponse | undefined,
  profilesState: InstrumentationMetadataState,
  selectedProfile: IntakeProfile | undefined
) {
  return {
    hasFlowBack: state.stage !== 'source' || Boolean(state.draft.sourceId),
    canContinueSource: Boolean(state.draft.recipeId) && metadataAllowsConfiguration(profilesState),
    platformOptions: catalog ? selectedRecipePlatforms(catalog, state.draft) : [],
    canRender: draftReady(state.draft) && profileCanRender(selectedProfile, state.token)
  };
}
