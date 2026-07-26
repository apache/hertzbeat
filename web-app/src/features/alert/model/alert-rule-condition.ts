/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { AlertRuleContractError } from './alert-rule-types';
import { parseMetricAlertConditionSource } from './alert-rule-condition-parser';
import { serializeMetricAlertConditionSource } from './alert-rule-condition-serializer';

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

const numericOperators: readonly MetricAlertNumericOperator[] = ['>', '<', '==', '!=', '<=', '>='];
const stringOperators: readonly MetricAlertStringOperator[] = [
  'equals',
  '!equals',
  'contains',
  '!contains',
  'matches',
  '!matches'
];
const existenceOperators = ['exists', '!exists'] as const;
/** Stable numeric codes emitted by the Java monitoring hierarchy contract. */
export const metricAlertFieldTypes = {
  number: 0,
  string: 1,
  object: 2,
  time: 3
} as const;
const supportedFieldTypes = new Set<number>(Object.values(metricAlertFieldTypes));
const safeFieldPattern = /^[A-Za-z_][A-Za-z0-9_.]*$/;
const maximumGroupDepth = 3;
const maximumItemsPerGroup = 5;

export function isMetricAlertFieldIdentifier(value: string) {
  return safeFieldPattern.test(value);
}

export function metricAlertOperatorsForType(type: number): readonly MetricAlertConditionOperator[] {
  if (type === metricAlertFieldTypes.number || type === metricAlertFieldTypes.time)
    return [...numericOperators, ...existenceOperators];
  if (type === metricAlertFieldTypes.string) return [...stringOperators, ...existenceOperators];
  if (type === metricAlertFieldTypes.object) return [...numericOperators, ...stringOperators, ...existenceOperators];
  return [];
}

/** Serializes only the condition subset represented by the structured editor. */
export function serializeMetricAlertCondition(group: MetricAlertConditionGroup, fields: MetricAlertField[]) {
  const fieldMap = metricFieldMap(fields);
  return serializeMetricAlertConditionSource(
    group,
    fieldMap,
    metricAlertOperatorsForType,
    maximumGroupDepth,
    maximumItemsPerGroup
  );
}

/**
 * Parses the structured subset conservatively. Unsupported or ambiguous input
 * returns null so callers can retain the source in expert mode.
 */
export function parseMetricAlertCondition(
  expression: string,
  fields: MetricAlertField[]
): MetricAlertConditionGroup | null {
  try {
    const source = expression.trim();
    if (!source) return null;
    return parseMetricAlertConditionSource(
      source,
      metricFieldMap(fields),
      metricAlertOperatorsForType,
      maximumGroupDepth,
      maximumItemsPerGroup
    );
  } catch {
    return null;
  }
}

function metricFieldMap(fields: MetricAlertField[]) {
  const result = new Map<string, MetricAlertField>();
  for (const field of fields) {
    if (!isMetricAlertFieldIdentifier(field.value) || !supportedFieldTypes.has(field.type) || result.has(field.value))
      throw contract('metric field catalog is invalid');
    result.set(field.value, field);
  }
  return result;
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
