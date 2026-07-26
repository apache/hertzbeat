/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type {
  MetricAlertCondition,
  MetricAlertConditionGroup,
  MetricAlertConditionOperator,
  MetricAlertField,
  MetricAlertNumericOperator
} from './alert-rule-condition-contract';
import { AlertRuleContractError } from './alert-rule-types';

type OperatorsForType = (type: number) => readonly MetricAlertConditionOperator[];

const numericOperators: readonly MetricAlertNumericOperator[] = ['>', '<', '==', '!=', '<=', '>='];

export function serializeMetricAlertConditionSource(
  group: MetricAlertConditionGroup,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType,
  maximumDepth: number,
  maximumItems: number
) {
  return serializeGroup(group, fields, operatorsForType, 1, maximumDepth, maximumItems);
}

function serializeGroup(
  group: MetricAlertConditionGroup,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType,
  depth: number,
  maximumDepth: number,
  maximumItems: number
): string {
  if (group.kind !== 'group' || (group.join !== 'and' && group.join !== 'or'))
    throw contract('condition group is invalid');
  if (depth > maximumDepth) throw contract('condition group is too deep');
  if (group.items.length < 1 || group.items.length > maximumItems)
    throw contract('condition group item count is invalid');

  return group.items
    .map(item => {
      if (item.kind === 'group') {
        return `(${serializeGroup(item, fields, operatorsForType, depth + 1, maximumDepth, maximumItems)})`;
      }
      return serializeCondition(item, fields, operatorsForType);
    })
    .join(` ${group.join} `);
}

function serializeCondition(
  condition: MetricAlertCondition,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType
) {
  const field = fields.get(condition.field);
  if (!field) throw contract('condition field is invalid');
  if (!operatorsForType(field.type).includes(condition.operator)) throw contract('condition operator is invalid');
  if (condition.operator === 'exists' || condition.operator === '!exists') {
    if (condition.value !== null) throw contract('existence condition value is invalid');
    return `${condition.operator}(${field.value})`;
  }
  if (numericOperators.includes(condition.operator as MetricAlertNumericOperator)) {
    if (typeof condition.value !== 'number' || !Number.isFinite(condition.value))
      throw contract('numeric condition value is invalid');
    return `${field.value} ${condition.operator} ${Object.is(condition.value, -0) ? 0 : condition.value}`;
  }
  if (typeof condition.value !== 'string') throw contract('string condition value is invalid');
  return `${condition.operator}(${field.value}, "${safeStringValue(condition.value)}")`;
}

function safeStringValue(value: string) {
  if (!value || /["\\\u0000-\u001f]/.test(value)) throw contract('string condition value is invalid');
  return value;
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
