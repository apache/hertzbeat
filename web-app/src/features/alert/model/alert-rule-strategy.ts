/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { alertRuleLabelValue, updateAlertRuleLabel, type AlertRuleDraft } from './alert-rule-draft';
import { createMetricAlertEditorDraft } from './alert-rule-metric-draft';
import type { AlertRuleDataType, AlertRuleKind } from './alert-rule-types';

export const periodicLogStarterExpression =
  "SELECT count(*) AS errorCount FROM hertzbeat_logs WHERE time_unix_nano >= NOW() - INTERVAL '30 second' AND severity_text = 'ERROR' HAVING count(*) > 2";

/**
 * Retires expressions when the operator crosses evaluation grammars. The
 * previous persisted strategy can no longer justify nullable or stale input.
 */
export function buildAlertRuleStrategyPatch(
  draft: AlertRuleDraft,
  kind: AlertRuleKind,
  dataType: AlertRuleDataType
): Partial<AlertRuleDraft> {
  if (draft.kind === kind && draft.dataType === dataType) return {};
  let labelsText = draft.labelsText;
  labelsText = updateAlertRuleLabel(
    labelsText,
    'alert_mode',
    dataType === 'log' ? alertRuleLabelValue(labelsText, 'alert_mode') : ''
  );
  return {
    kind,
    dataType,
    expr: kind === 'periodic' && dataType === 'log' ? periodicLogStarterExpression : '',
    period: kind === 'periodic' ? (draft.period ?? 300) : draft.period,
    labelsText,
    ...(kind === 'realtime' && dataType === 'metric'
      ? { metricEditor: createMetricAlertEditorDraft(draft.authoringMode) }
      : {}),
    strategyChanged: true
  };
}
