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
