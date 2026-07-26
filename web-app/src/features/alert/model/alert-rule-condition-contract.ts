/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type MetricAlertField = {
  value: string;
  label: string;
  type: number;
  unit: string | null;
};

export type MetricAlertNumericOperator = '>' | '<' | '==' | '!=' | '<=' | '>=';
export type MetricAlertStringOperator = 'equals' | '!equals' | 'contains' | '!contains' | 'matches' | '!matches';
export type MetricAlertConditionOperator =
  MetricAlertNumericOperator | MetricAlertStringOperator | 'exists' | '!exists';

export type MetricAlertCondition = {
  kind: 'condition';
  field: string;
  operator: MetricAlertConditionOperator;
  value: string | number | null;
};

export type MetricAlertConditionGroup = {
  kind: 'group';
  join: 'and' | 'or';
  items: Array<MetricAlertCondition | MetricAlertConditionGroup>;
};
