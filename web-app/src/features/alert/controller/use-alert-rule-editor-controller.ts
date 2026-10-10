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

import isEqual from 'lodash/isEqual';

import { useAlertRuleDraftController } from './use-alert-rule-draft-controller';
import { createAlertRuleStrategyCommands } from './alert-rule-editor-strategy-commands';
import { createAlertRuleMetricEditorCommands } from './alert-rule-metric-editor-commands';
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
  const { baselineDraft, updateDraft } = useAlertRuleDraftController(mode, route, datasource, command, preview);
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
      dirty: draft !== null && !isEqual(draft, baselineDraft),
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
