/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  buildAlertRuleStrategyPatch,
  firstSupportedPeriodicDataType,
  isAlertRuleStrategySupported,
  type AlertRuleDatasourceState,
  type AlertRuleDataType,
  type AlertRuleDraft,
  type AlertRuleKind
} from '../model/alert-rule-model';

export function createAlertRuleStrategyCommands(
  draft: AlertRuleDraft | null,
  datasource: AlertRuleDatasourceState,
  updateDraft: (patch: Partial<AlertRuleDraft>) => void
) {
  const changeKind = (kind: AlertRuleKind) => {
    if (!draft) return;
    if (kind === 'realtime') {
      const dataType = draft.dataType === 'trace' ? 'metric' : draft.dataType;
      updateDraft(buildAlertRuleStrategyPatch(draft, kind, dataType));
      return;
    }
    if (datasource.kind !== 'ready') return;
    const dataType = isAlertRuleStrategySupported(datasource.status, kind, draft.dataType)
      ? draft.dataType
      : firstSupportedPeriodicDataType(datasource.status);
    if (dataType) updateDraft(buildAlertRuleStrategyPatch(draft, kind, dataType));
  };
  const changeDataType = (dataType: AlertRuleDataType) => {
    if (!draft) return;
    if (draft.kind === 'realtime') {
      if (dataType !== 'trace') updateDraft(buildAlertRuleStrategyPatch(draft, draft.kind, dataType));
      return;
    }
    if (datasource.kind === 'ready' && isAlertRuleStrategySupported(datasource.status, draft.kind, dataType)) {
      updateDraft(buildAlertRuleStrategyPatch(draft, draft.kind, dataType));
    }
  };
  return { changeDataType, changeKind };
}
