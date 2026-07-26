/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { MetricAlertConditionGroup } from './alert-rule-condition-contract';
import type { AlertRuleWritableSnapshot } from './alert-rule-draft-snapshot';
import type { RealtimeMetricTarget } from './alert-rule-metric-expression';
import type { AlertRuleDataType, AlertRuleKind } from './alert-rule-types';

export type MetricAlertAuthoring =
  { mode: 'structured'; condition: MetricAlertConditionGroup } | { mode: 'expert'; condition: string };

export type MetricAlertEditorDraft =
  | { kind: 'unparsed'; expression: string }
  | {
      kind: 'targeted';
      app: string;
      target: RealtimeMetricTarget | null;
      monitorIds: number[];
      monitorLabels: string[];
      authoring: MetricAlertAuthoring;
    };

export type AlertRuleDraft = {
  id?: number;
  name: string;
  kind: AlertRuleKind;
  dataType: AlertRuleDataType;
  expr: string;
  template: string;
  labelsText: string;
  annotations: Record<string, string> | null;
  enable: boolean;
  period: number | null;
  times: number | null;
  /** Transient editor evidence; explicit payload builders never serialize it. */
  strategyChanged?: boolean;
  metricEditor?: MetricAlertEditorDraft;
  persisted?: AlertRuleWritableSnapshot;
};
