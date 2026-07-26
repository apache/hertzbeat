/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  parseMetricAlertCondition,
  serializeCompleteMetricAlertCondition,
  type MetricAlertField
} from './alert-rule-condition';
import type { AlertRuleDraft, MetricAlertAuthoring, MetricAlertEditorDraft } from './alert-rule-draft-contract';
import {
  buildRealtimeMetricExpression,
  parseRealtimeMetricExpression,
  type RealtimeMetricTarget
} from './alert-rule-metric-expression';
import { AlertRuleContractError } from './alert-rule-types';

export type { MetricAlertAuthoring, MetricAlertEditorDraft } from './alert-rule-draft-contract';

export function createMetricAlertEditorDraft(): MetricAlertEditorDraft {
  return {
    kind: 'targeted',
    app: '',
    target: null,
    monitorIds: [],
    monitorLabels: [],
    authoring: emptyStructuredAuthoring()
  };
}

export function metricAlertEditorFromExpression(expression: string): MetricAlertEditorDraft {
  if (!expression) return createMetricAlertEditorDraft();
  const context = parseRealtimeMetricExpression(expression);
  if (!context) return { kind: 'unparsed', expression };
  return {
    kind: 'targeted',
    app: context.target.app,
    target: context.target,
    monitorIds: context.monitorIds,
    monitorLabels: context.monitorLabels,
    authoring:
      context.target.kind === 'availability'
        ? emptyStructuredAuthoring()
        : { mode: 'expert', condition: context.condition }
  };
}

export function buildMetricAlertApplicationPatch(draft: AlertRuleDraft, application: string): Partial<AlertRuleDraft> {
  requireRealtimeMetric(draft);
  const app = application.trim();
  if (!app) throw contract('metric alert application is invalid');
  if (draft.metricEditor?.kind === 'targeted' && draft.metricEditor.app === app) return {};
  return {
    expr: '',
    metricEditor: {
      kind: 'targeted',
      app,
      target: null,
      monitorIds: [],
      monitorLabels: [],
      authoring: emptyStructuredAuthoring()
    }
  };
}

export function buildMetricAlertTargetPatch(
  draft: AlertRuleDraft,
  target: RealtimeMetricTarget
): Partial<AlertRuleDraft> {
  const editor = targetedEditor(draft);
  if (target.app !== editor.app) throw contract('metric alert target application changed');
  if (sameTarget(editor.target, target)) return {};
  const next: Extract<MetricAlertEditorDraft, { kind: 'targeted' }> = {
    kind: 'targeted',
    app: editor.app,
    target,
    monitorIds: [],
    monitorLabels: [],
    authoring: emptyStructuredAuthoring()
  };
  return {
    expr:
      target.kind === 'availability'
        ? buildRealtimeMetricExpression({
            target,
            monitorIds: [],
            monitorLabels: [],
            condition: ''
          })
        : '',
    metricEditor: next
  };
}

/**
 * Keeps the current raw textarea compatible until the guided controls replace
 * it. Explicit guided transitions provide their own metricEditor atomically.
 */
export function synchronizeMetricAlertDraftPatch(
  draft: AlertRuleDraft,
  patch: Partial<AlertRuleDraft>
): Partial<AlertRuleDraft> {
  if (
    draft.kind !== 'realtime' ||
    draft.dataType !== 'metric' ||
    typeof patch.expr !== 'string' ||
    Object.prototype.hasOwnProperty.call(patch, 'metricEditor')
  ) {
    return patch;
  }
  return { ...patch, metricEditor: metricAlertEditorFromExpression(patch.expr) };
}

export function buildMetricAlertStructuredConditionPatch(
  draft: AlertRuleDraft,
  condition: MetricAlertConditionGroup,
  fields: MetricAlertField[]
): Partial<AlertRuleDraft> {
  const editor = targetedMetricEditor(draft);
  const threshold = serializeCompleteMetricAlertCondition(condition, fields);
  const expression = threshold ? composeTargetedExpression(editor, threshold) : '';
  return {
    expr: expression,
    metricEditor: {
      ...editor,
      authoring: { mode: 'structured', condition }
    }
  };
}

export function buildMetricAlertAuthoringModePatch(
  draft: AlertRuleDraft,
  mode: MetricAlertAuthoring['mode'],
  fields: MetricAlertField[]
): Partial<AlertRuleDraft> {
  const editor = targetedMetricEditor(draft);
  if (editor.authoring.mode === mode) return {};
  if (mode === 'structured') return recoverMetricAlertStructuredAuthoring(draft, fields);
  if (editor.authoring.mode !== 'structured') return {};
  const threshold = serializeCompleteMetricAlertCondition(editor.authoring.condition, fields);
  return threshold === null ? {} : buildMetricAlertExpertConditionPatch(draft, threshold);
}

export function buildMetricAlertExpertConditionPatch(
  draft: AlertRuleDraft,
  condition: string
): Partial<AlertRuleDraft> {
  const editor = targetedMetricEditor(draft);
  const normalized = condition.trim();
  return {
    expr: normalized ? composeTargetedExpression(editor, normalized) : '',
    metricEditor: {
      ...editor,
      authoring: { mode: 'expert', condition }
    }
  };
}

/**
 * Derives visual authoring only when the current field catalog represents the
 * entire threshold. The persisted expression remains byte-for-byte unchanged.
 */
export function recoverMetricAlertStructuredAuthoring(
  draft: AlertRuleDraft,
  fields: MetricAlertField[]
): Partial<AlertRuleDraft> {
  const editor = draft.metricEditor;
  if (editor?.kind !== 'targeted' || editor.target?.kind !== 'metric' || editor.authoring.mode !== 'expert') {
    return {};
  }
  const condition = parseMetricAlertCondition(editor.authoring.condition, fields);
  if (!condition) return {};
  return {
    expr: draft.expr,
    metricEditor: {
      ...editor,
      authoring: { mode: 'structured', condition }
    }
  };
}

function composeTargetedExpression(editor: Extract<MetricAlertEditorDraft, { kind: 'targeted' }>, condition: string) {
  if (!editor.target) throw contract('metric alert target is missing');
  return buildRealtimeMetricExpression({
    target: editor.target,
    monitorIds: editor.monitorIds,
    monitorLabels: editor.monitorLabels,
    condition
  });
}

function targetedEditor(draft: AlertRuleDraft) {
  requireRealtimeMetric(draft);
  if (draft.metricEditor?.kind !== 'targeted') throw contract('metric alert source requires explicit target selection');
  return draft.metricEditor;
}

function targetedMetricEditor(draft: AlertRuleDraft) {
  const editor = targetedEditor(draft);
  if (editor.target?.kind !== 'metric') throw contract('metric alert threshold target is missing');
  return editor;
}

function requireRealtimeMetric(draft: AlertRuleDraft) {
  if (draft.kind !== 'realtime' || draft.dataType !== 'metric') throw contract('metric alert strategy is inactive');
}

function sameTarget(current: RealtimeMetricTarget | null, next: RealtimeMetricTarget) {
  if (!current || current.kind !== next.kind || current.app !== next.app) return false;
  return current.kind === 'availability' || (next.kind === 'metric' && current.metric === next.metric);
}

function emptyStructuredAuthoring(): MetricAlertAuthoring {
  return {
    mode: 'structured',
    condition: { kind: 'group', join: 'and', items: [] }
  };
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
