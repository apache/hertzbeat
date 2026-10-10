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

import { useCallback, useEffect } from 'react';
import {
  buildAlertRuleStrategyPatch,
  firstSupportedPeriodicDataType,
  isAlertRuleStrategySupported,
  synchronizeMetricAlertDraftPatch,
  type AlertRuleDraft
} from '../model/alert-rule-model';
import type { AlertRuleRouteState } from './alert-rule-editor-state';
import type { useAlertRuleEditorRoute } from './use-alert-rule-editor-route';
import type { useAlertRuleDatasourceController } from './use-alert-rule-datasource-controller';
import type { useAlertRuleCommandController } from './use-alert-rule-command-controller';
import type { useAlertRulePreviewController } from './use-alert-rule-preview-controller';

export function useAlertRuleDraftController(
  mode: 'new' | 'edit',
  route: ReturnType<typeof useAlertRuleEditorRoute>,
  datasource: ReturnType<typeof useAlertRuleDatasourceController>,
  command: ReturnType<typeof useAlertRuleCommandController>,
  preview: ReturnType<typeof useAlertRulePreviewController>
) {
  const draft = route.draft;
  const baselineDraft = resolveBaselineDraft(mode, route.baselineDraft, datasource.state);
  const isCommandLocked = command.isLocked;
  const invalidateIdentity = route.identity.invalidate;
  const invalidatePreview = preview.invalidate;
  const updateRoute = route.updateRoute;
  const updateDraft = useCallback(
    (patch: Partial<AlertRuleDraft>) => {
      if (!draft || isCommandLocked()) return;
      invalidateIdentity();
      invalidatePreview();
      updateRoute(updatedDraftState(draft, patch));
    },
    [draft, invalidateIdentity, invalidatePreview, isCommandLocked, updateRoute]
  );
  useEffect(() => {
    if (
      mode !== 'new' ||
      route.requestedKind !== 'periodic' ||
      !draft ||
      datasource.state.kind !== 'ready' ||
      isAlertRuleStrategySupported(datasource.state.status, 'periodic', draft.dataType)
    ) {
      return;
    }
    const supportedDataType = firstSupportedPeriodicDataType(datasource.state.status);
    if (supportedDataType) updateDraft(buildAlertRuleStrategyPatch(draft, 'periodic', supportedDataType));
  }, [datasource.state, draft, mode, route.requestedKind, updateDraft]);
  return { baselineDraft, updateDraft };
}

function resolveBaselineDraft(
  mode: 'new' | 'edit',
  baselineDraft: AlertRuleDraft | null,
  datasourceState: ReturnType<typeof useAlertRuleDatasourceController>['state']
) {
  if (
    mode === 'new' &&
    baselineDraft?.kind === 'periodic' &&
    datasourceState.kind === 'ready' &&
    !isAlertRuleStrategySupported(datasourceState.status, 'periodic', baselineDraft.dataType)
  ) {
    const supportedDataType = firstSupportedPeriodicDataType(datasourceState.status);
    if (supportedDataType)
      baselineDraft = {
        ...baselineDraft,
        ...buildAlertRuleStrategyPatch(baselineDraft, 'periodic', supportedDataType)
      };
  }
  return baselineDraft;
}

function updatedDraftState(draft: AlertRuleDraft, patch: Partial<AlertRuleDraft>): Partial<AlertRuleRouteState> {
  return {
    draft: { ...draft, ...synchronizeMetricAlertDraftPatch(draft, patch) },
    preview: { kind: 'idle' },
    saveFailure: undefined,
    recovery: undefined
  };
}
