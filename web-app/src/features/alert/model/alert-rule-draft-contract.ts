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
  /** Transient visual/expression mode shared by realtime metric and log editors. */
  authoringMode?: MetricAlertAuthoring['mode'];
  /** Transient editor evidence; explicit payload builders never serialize it. */
  strategyChanged?: boolean;
  metricEditor?: MetricAlertEditorDraft;
  persisted?: AlertRuleWritableSnapshot;
};
