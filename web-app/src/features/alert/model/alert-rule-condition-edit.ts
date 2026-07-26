/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  metricAlertConditionLimits,
  metricAlertOperatorsForType,
  type MetricAlertCondition,
  type MetricAlertConditionGroup,
  type MetricAlertConditionOperator,
  type MetricAlertField
} from './alert-rule-condition';
import { AlertRuleContractError } from './alert-rule-types';

type ConditionPath = number[];

export function addMetricAlertCondition(
  root: MetricAlertConditionGroup,
  groupPath: ConditionPath,
  fields: MetricAlertField[]
) {
  const condition = newCondition(fields);
  return updateGroup(root, groupPath, group => appendItem(group, condition));
}

export function addMetricAlertConditionGroup(
  root: MetricAlertConditionGroup,
  groupPath: ConditionPath,
  fields: MetricAlertField[]
) {
  if (groupPath.length + 2 > metricAlertConditionLimits.maximumDepth) {
    throw contract('condition group is too deep');
  }
  const group: MetricAlertConditionGroup = {
    kind: 'group',
    join: 'and',
    items: [newCondition(fields)]
  };
  return updateGroup(root, groupPath, parent => appendItem(parent, group));
}

export function updateMetricAlertConditionGroupJoin(
  root: MetricAlertConditionGroup,
  groupPath: ConditionPath,
  join: MetricAlertConditionGroup['join']
) {
  if (join !== 'and' && join !== 'or') throw contract('condition group join is invalid');
  return updateGroup(root, groupPath, group => ({ ...group, join }));
}

export function removeMetricAlertConditionItem(root: MetricAlertConditionGroup, itemPath: ConditionPath) {
  const [parentPath, itemIndex] = splitItemPath(itemPath);
  return updateGroup(root, parentPath, group => {
    if (!group.items[itemIndex]) throw contract('condition item path is invalid');
    return { ...group, items: group.items.filter((_, index) => index !== itemIndex) };
  });
}

export function changeMetricAlertConditionField(
  root: MetricAlertConditionGroup,
  itemPath: ConditionPath,
  fieldValue: string,
  fields: MetricAlertField[]
) {
  const field = requiredField(fields, fieldValue);
  const operator = firstOperator(field);
  return updateCondition(root, itemPath, () => ({
    kind: 'condition',
    field: field.value,
    operator,
    value: initialValue(operator)
  }));
}

export function changeMetricAlertConditionOperator(
  root: MetricAlertConditionGroup,
  itemPath: ConditionPath,
  operator: MetricAlertConditionOperator,
  fields: MetricAlertField[]
) {
  return updateCondition(root, itemPath, current => {
    const field = requiredField(fields, current.field);
    if (!metricAlertOperatorsForType(field.type).includes(operator)) {
      throw contract('condition operator is invalid');
    }
    return { ...current, operator, value: initialValue(operator) };
  });
}

export function updateMetricAlertConditionValue(
  root: MetricAlertConditionGroup,
  itemPath: ConditionPath,
  value: string | number | null
) {
  return updateCondition(root, itemPath, current => ({
    ...current,
    value: normalizeValue(current.operator, value)
  }));
}

function updateCondition(
  root: MetricAlertConditionGroup,
  itemPath: ConditionPath,
  update: (condition: MetricAlertCondition) => MetricAlertCondition
) {
  const [parentPath, itemIndex] = splitItemPath(itemPath);
  return updateGroup(root, parentPath, group => {
    const item = group.items[itemIndex];
    if (!item || item.kind !== 'condition') throw contract('condition item path is invalid');
    return {
      ...group,
      items: group.items.map((current, index) => (index === itemIndex ? update(item) : current))
    };
  });
}

function updateGroup(
  root: MetricAlertConditionGroup,
  groupPath: ConditionPath,
  update: (group: MetricAlertConditionGroup) => MetricAlertConditionGroup
): MetricAlertConditionGroup {
  if (groupPath.length === 0) return update(root);
  const [index, ...rest] = groupPath;
  const item = index === undefined ? undefined : root.items[index];
  if (!item || item.kind !== 'group') throw contract('condition group path is invalid');
  return {
    ...root,
    items: root.items.map((current, currentIndex) =>
      currentIndex === index ? updateGroup(item, rest, update) : current
    )
  };
}

function appendItem(group: MetricAlertConditionGroup, item: MetricAlertCondition | MetricAlertConditionGroup) {
  if (group.items.length >= metricAlertConditionLimits.maximumItemsPerGroup) {
    throw contract('condition group item count is invalid');
  }
  return { ...group, items: [...group.items, item] };
}

function newCondition(fields: MetricAlertField[]): MetricAlertCondition {
  const field = fields[0];
  if (!field) throw contract('metric field catalog is empty');
  const operator = firstOperator(field);
  return { kind: 'condition', field: field.value, operator, value: initialValue(operator) };
}

function firstOperator(field: MetricAlertField) {
  const operator = metricAlertOperatorsForType(field.type)[0];
  if (!operator) throw contract('metric field has no operators');
  return operator;
}

function requiredField(fields: MetricAlertField[], value: string) {
  const matches = fields.filter(field => field.value === value);
  if (matches.length !== 1) throw contract('metric field is invalid');
  return matches[0]!;
}

function initialValue(operator: MetricAlertConditionOperator) {
  if (operator === 'exists' || operator === '!exists') return null;
  return ['>', '<', '==', '!=', '<=', '>='].includes(operator) ? 0 : '';
}

function normalizeValue(operator: MetricAlertConditionOperator, value: string | number | null) {
  if (operator === 'exists' || operator === '!exists') return null;
  if (['>', '<', '==', '!=', '<=', '>='].includes(operator)) {
    if (value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw contract('numeric condition value is invalid');
    return value;
  }
  if (typeof value !== 'string') throw contract('string condition value is invalid');
  return value;
}

function splitItemPath(path: ConditionPath): [ConditionPath, number] {
  const itemIndex = path[path.length - 1];
  if (itemIndex === undefined || !Number.isSafeInteger(itemIndex) || itemIndex < 0) {
    throw contract('condition item path is invalid');
  }
  return [path.slice(0, -1), itemIndex];
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
