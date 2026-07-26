/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  buildMetricAlertApplicationPatch,
  buildMetricAlertAuthoringModePatch,
  buildMetricAlertExpertConditionPatch,
  buildMetricAlertStructuredConditionPatch,
  buildMetricAlertTargetPatch,
  isMetricAlertTargetInHierarchy,
  metricAlertFieldsForTarget,
  type AlertRuleDraft,
  type MetricAlertAuthoring,
  type MetricAlertConditionGroup,
  type RealtimeMetricTarget
} from '../model/alert-rule-model';
import type { AlertRuleMetricTargetState } from './use-alert-rule-metric-target-controller';

type UpdateDraft = (patch: Partial<AlertRuleDraft>) => void;

/**
 * Keeps Monitor-catalog guards and metric authoring transitions together.
 * The route controller only coordinates lifecycle and save/preview ownership.
 */
export function createAlertRuleMetricEditorCommands(
  draft: AlertRuleDraft | null,
  targetState: AlertRuleMetricTargetState,
  updateDraft: UpdateDraft
) {
  const fields = currentMetricFields(draft, targetState);
  return {
    changeMetricApplication: (application: string) => {
      if (!draft || targetState.apps.kind !== 'ready') return;
      if (!targetState.apps.apps.some(app => app.value === application)) return;
      updateDraft(buildMetricAlertApplicationPatch(draft, application));
    },
    changeMetricTarget: (target: RealtimeMetricTarget) => {
      if (!draft || targetState.hierarchy.kind !== 'ready') return;
      if (!isMetricAlertTargetInHierarchy(targetState.hierarchy.hierarchy, target)) return;
      updateDraft(buildMetricAlertTargetPatch(draft, target));
    },
    changeMetricStructuredCondition: (condition: MetricAlertConditionGroup) => {
      if (!draft || !fields) return;
      updateDraft(buildMetricAlertStructuredConditionPatch(draft, condition, fields));
    },
    changeMetricExpertCondition: (condition: string) => {
      if (!draft || !fields) return;
      updateDraft(buildMetricAlertExpertConditionPatch(draft, condition));
    },
    changeMetricAuthoringMode: (mode: MetricAlertAuthoring['mode']) => {
      if (!draft || !fields) return;
      updateDraft(buildMetricAlertAuthoringModePatch(draft, mode, fields));
    }
  };
}

function currentMetricFields(draft: AlertRuleDraft | null, state: AlertRuleMetricTargetState) {
  const target = draft?.metricEditor?.kind === 'targeted' ? draft.metricEditor.target : null;
  if (state.hierarchy.kind !== 'ready' || target?.kind !== 'metric') return null;
  return metricAlertFieldsForTarget(state.hierarchy.hierarchy, target);
}
