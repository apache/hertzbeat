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
import { hasUnsafeAlertRuleSourceCharacter } from './alert-rule-source-safety';
import { AlertRuleContractError } from './alert-rule-types';
import { resolveMetricAlertFieldSource } from './alert-rule-condition-field';

type OperatorsForType = (type: number) => readonly MetricAlertConditionOperator[];
type SerializationMode = 'complete' | 'authoring';

const numericOperators: readonly MetricAlertNumericOperator[] = ['>', '<', '==', '!=', '<=', '>='];

export function serializeMetricAlertConditionSource(
  group: MetricAlertConditionGroup,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType,
  maximumDepth: number,
  maximumItems: number
) {
  return serializeGroup(group, fields, operatorsForType, 1, maximumDepth, maximumItems, 'complete');
}

export function serializeMetricAlertConditionAuthoringSource(
  group: MetricAlertConditionGroup,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType,
  maximumDepth: number,
  maximumItems: number
) {
  return serializeGroup(group, fields, operatorsForType, 1, maximumDepth, maximumItems, 'authoring');
}

function serializeGroup(
  group: MetricAlertConditionGroup,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType,
  depth: number,
  maximumDepth: number,
  maximumItems: number,
  mode: SerializationMode
): string {
  if (group.kind !== 'group' || (group.join !== 'and' && group.join !== 'or'))
    throw contract('condition group is invalid');
  if (depth > maximumDepth) throw contract('condition group is too deep');
  if (group.items.length > maximumItems) throw contract('condition group item count is invalid');
  if (group.items.length === 0) {
    if (mode === 'authoring') return '';
    throw contract('condition group item count is invalid');
  }

  return group.items
    .flatMap(item => {
      if (item.kind === 'group') {
        const nested = serializeGroup(item, fields, operatorsForType, depth + 1, maximumDepth, maximumItems, mode);
        return nested ? [`(${nested})`] : [];
      }
      return [serializeCondition(item, fields, operatorsForType, mode)];
    })
    .join(` ${group.join} `);
}

function serializeCondition(
  condition: MetricAlertCondition,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType,
  mode: SerializationMode
) {
  const resolved = resolveMetricAlertFieldSource(fields, condition.field);
  if (!resolved) throw contract('condition field is invalid');
  if (!operatorsForType(resolved.field.type).includes(condition.operator))
    throw contract('condition operator is invalid');
  if (condition.operator === 'exists' || condition.operator === '!exists')
    return serializeExistenceCondition(condition, resolved.source);
  if (numericOperators.includes(condition.operator as MetricAlertNumericOperator)) {
    return serializeNumericCondition(condition, resolved.source, mode);
  }
  return serializeStringCondition(condition, resolved.source, mode);
}

function serializeExistenceCondition(condition: MetricAlertCondition, fieldSource: string) {
  if (condition.value !== null) throw contract('existence condition value is invalid');
  return `${condition.operator}(${fieldSource})`;
}

function serializeNumericCondition(condition: MetricAlertCondition, fieldSource: string, mode: SerializationMode) {
  if (condition.value === null && mode === 'authoring') return `${fieldSource} ${condition.operator} undefined`;
  if (typeof condition.value !== 'number' || !Number.isFinite(condition.value))
    throw contract('numeric condition value is invalid');
  return `${fieldSource} ${condition.operator} ${Object.is(condition.value, -0) ? 0 : condition.value}`;
}

function serializeStringCondition(condition: MetricAlertCondition, fieldSource: string, mode: SerializationMode) {
  if (condition.value === '' && mode === 'authoring') return `${condition.operator}(${fieldSource}, "undefined")`;
  if (typeof condition.value !== 'string') throw contract('string condition value is invalid');
  return `${condition.operator}(${fieldSource}, "${safeStringValue(condition.value)}")`;
}

function safeStringValue(value: string) {
  if (!value || hasUnsafeAlertRuleSourceCharacter(value)) throw contract('string condition value is invalid');
  return value;
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
