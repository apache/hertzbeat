/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useEffect } from 'react';

import {
  buildAlertRuleStrategyPatch,
  firstSupportedPeriodicDataType,
  isAlertRuleStrategySupported,
  synchronizeMetricAlertDraftPatch,
  type AlertRuleDraft
} from '../model/alert-rule-model';
import { createAlertRuleStrategyCommands } from './alert-rule-editor-strategy-commands';
import { createAlertRuleMetricEditorCommands } from './alert-rule-metric-editor-commands';
import type { AlertRuleRouteState } from './alert-rule-editor-state';
import { useAlertRuleCommandController } from './use-alert-rule-command-controller';
import { useAlertRuleDatasourceController } from './use-alert-rule-datasource-controller';
import { useAlertRuleEditorRoute } from './use-alert-rule-editor-route';
import { useAlertLabelSuggestionController } from './use-alert-label-suggestion-controller';
import { useAlertRuleMetricBindingController } from './use-alert-rule-metric-binding-controller';
import { useAlertRuleMetricTargetController } from './use-alert-rule-metric-target-controller';
import { useAlertRulePreviewController } from './use-alert-rule-preview-controller';

export function useAlertRuleEditorController(mode: 'new' | 'edit') {
  const route = useAlertRuleEditorRoute(mode);
  const datasource = useAlertRuleDatasourceController();
  const labelSuggestions = useAlertLabelSuggestionController();
  const draft = route.draft;
  const metricTarget = useAlertRuleMetricTargetController(draft);
  const command = useAlertRuleCommandController(mode, draft, route.identity, route.updateRoute);
  const preview = useAlertRulePreviewController(command.canSave, draft, route.identity, route.updateRoute);
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
  const strategy = createAlertRuleStrategyCommands(draft, datasource.state, updateDraft);
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
  const metricEditor = createAlertRuleMetricEditorCommands(draft, metricTarget.state, updateDraft);
  const metricBindings = useAlertRuleMetricBindingController(draft, metricTarget.state, updateDraft);
  return {
    state: {
      command: route.active.command,
      canSave: command.canSave,
      datasource: datasource.state,
      detail: route.detail,
      draft,
      labelSuggestions,
      metricBindings: metricBindings.state,
      metricTarget: metricTarget.state,
      preview: route.active.preview,
      requestedKind: route.requestedKind,
      saveFailure: route.active.saveFailure,
      recovery: route.active.recovery
    },
    updateDraft,
    changeDataType: strategy.changeDataType,
    changeKind: strategy.changeKind,
    ...metricEditor,
    openMetricBindings: metricBindings.open,
    cancelMetricBindings: metricBindings.cancel,
    confirmMetricBindings: metricBindings.confirm,
    changeMetricBindingIds: metricBindings.changeMonitorIds,
    changeMetricBindingLabels: metricBindings.changeLabels,
    retryMetricBindings: metricBindings.retry,
    preview: preview.preview,
    save: command.save,
    retrySave: command.retry,
    retryDetail: route.retryDetail,
    retryDatasource: datasource.retry,
    retryMetricTargetApps: metricTarget.retryApps,
    retryMetricTargetHierarchy: metricTarget.retryHierarchy,
    cancel: route.cancel
  };
}

function updatedDraftState(draft: AlertRuleDraft, patch: Partial<AlertRuleDraft>): Partial<AlertRuleRouteState> {
  return {
    draft: { ...draft, ...synchronizeMetricAlertDraftPatch(draft, patch) },
    preview: { kind: 'idle' },
    saveFailure: undefined,
    recovery: undefined
  };
}
