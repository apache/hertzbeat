/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertRuleDraft } from './alert-rule-draft';
import { serializeMetricAlertConditionAuthoring, type MetricAlertField } from './alert-rule-condition';
import {
  buildRealtimeMetricAuthoringExpression,
  normalizeRealtimeMetricBindings,
  type RealtimeMetricBindings
} from './alert-rule-metric-expression';
import type { MetricAlertEditorDraft } from './alert-rule-metric-draft';
import { AlertRuleContractError } from './alert-rule-types';

type TargetedMetricEditor = Extract<MetricAlertEditorDraft, { kind: 'targeted' }>;

/**
 * Rebuilds the expression from the guided editor so monitor bindings never
 * become an independent source of truth from the persisted rule expression.
 */
export function buildMetricAlertBindingsPatch(
  draft: AlertRuleDraft,
  monitorIds: number[],
  monitorLabels: string[],
  fields: MetricAlertField[]
): Partial<AlertRuleDraft> {
  const editor = targetedEditor(draft);
  const bindings = normalizeRealtimeMetricBindings(monitorIds, monitorLabels);
  if (sameBindings(editor, bindings)) return {};
  const next = { ...editor, ...bindings };
  return {
    expr: bindingExpression(next, fields),
    metricEditor: next
  };
}

function bindingExpression(editor: TargetedMetricEditor, fields: MetricAlertField[]) {
  if (!editor.target) throw contract('metric alert target is missing');
  if (editor.target.kind === 'availability') return composeAuthoringExpression(editor, '');
  const threshold = bindingThreshold(editor, fields);
  return composeAuthoringExpression(editor, threshold ?? '');
}

function composeAuthoringExpression(editor: TargetedMetricEditor, condition: string) {
  if (!editor.target) throw contract('metric alert target is missing');
  return buildRealtimeMetricAuthoringExpression({
    target: editor.target,
    monitorIds: editor.monitorIds,
    monitorLabels: editor.monitorLabels,
    condition
  });
}

function targetedEditor(draft: AlertRuleDraft): TargetedMetricEditor {
  if (draft.kind !== 'realtime' || draft.dataType !== 'metric') {
    throw contract('metric alert strategy is inactive');
  }
  const editor = draft.metricEditor;
  if (editor?.kind !== 'targeted' || !editor.target) {
    throw contract('metric alert target is missing');
  }
  return editor;
}

function bindingThreshold(editor: TargetedMetricEditor, fields: MetricAlertField[]) {
  if (editor.authoring.mode === 'expert') {
    const threshold = editor.authoring.condition.trim();
    return threshold || null;
  }
  return serializeMetricAlertConditionAuthoring(editor.authoring.condition, fields) || null;
}

function sameBindings(editor: TargetedMetricEditor, bindings: RealtimeMetricBindings) {
  return sameValues(editor.monitorIds, bindings.monitorIds) && sameValues(editor.monitorLabels, bindings.monitorLabels);
}

function sameValues<T>(current: T[], next: T[]) {
  return current.length === next.length && current.every((value, index) => value === next[index]);
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
