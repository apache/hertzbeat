/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { synchronizeMetricAlertDraftPatch, type AlertRuleDraft } from '../model/alert-rule-model';
import { createAlertRuleStrategyCommands } from './alert-rule-editor-strategy-commands';
import { createAlertRuleMetricEditorCommands } from './alert-rule-metric-editor-commands';
import type { AlertRuleRouteState } from './alert-rule-editor-state';
import { useAlertRuleCommandController } from './use-alert-rule-command-controller';
import { useAlertRuleDatasourceController } from './use-alert-rule-datasource-controller';
import { useAlertRuleEditorRoute } from './use-alert-rule-editor-route';
import { useAlertRuleMetricBindingController } from './use-alert-rule-metric-binding-controller';
import { useAlertRuleMetricTargetController } from './use-alert-rule-metric-target-controller';
import { useAlertRulePreviewController } from './use-alert-rule-preview-controller';

export function useAlertRuleEditorController(mode: 'new' | 'edit') {
  const route = useAlertRuleEditorRoute(mode);
  const datasource = useAlertRuleDatasourceController();
  const draft = route.draft;
  const metricTarget = useAlertRuleMetricTargetController(draft);
  const command = useAlertRuleCommandController(mode, draft, route.identity, route.updateRoute);
  const preview = useAlertRulePreviewController(draft, route.identity, route.updateRoute);
  const updateDraft = (patch: Partial<AlertRuleDraft>) => {
    if (!draft || command.isLocked()) return;
    route.identity.invalidate();
    preview.invalidate();
    route.updateRoute(updatedDraftState(draft, patch));
  };
  const strategy = createAlertRuleStrategyCommands(draft, datasource.state, updateDraft);
  const metricEditor = createAlertRuleMetricEditorCommands(draft, metricTarget.state, updateDraft);
  const metricBindings = useAlertRuleMetricBindingController(draft, metricTarget.state, updateDraft);
  return {
    state: {
      command: route.active.command,
      canSave: command.canSave,
      datasource: datasource.state,
      detail: route.detail,
      draft,
      metricBindings: metricBindings.state,
      metricTarget: metricTarget.state,
      preview: route.active.preview,
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
