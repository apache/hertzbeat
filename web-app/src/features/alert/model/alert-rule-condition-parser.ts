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
  MetricAlertField
} from './alert-rule-condition-contract';

type OperatorsForType = (type: number) => readonly MetricAlertConditionOperator[];

export function parseMetricAlertConditionSource(
  expression: string,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType,
  maximumDepth: number,
  maximumItems: number
) {
  return parseGroup(expression, fields, operatorsForType, 1, maximumDepth, maximumItems);
}

function parseGroup(
  expression: string,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType,
  depth: number,
  maximumDepth: number,
  maximumItems: number
): MetricAlertConditionGroup | null {
  if (depth > maximumDepth) return null;
  const source = unwrapOuterGroup(expression);
  const split = splitLogical(source);
  if (!split || split.items.length > maximumItems) return null;
  if (split.operators.length === 0) {
    const condition = parseCondition(source, fields, operatorsForType);
    return condition ? { kind: 'group', join: 'and', items: [condition] } : null;
  }
  const [join] = split.operators;
  if (!join || split.operators.some(operator => operator !== join)) return null;
  const items: Array<MetricAlertCondition | MetricAlertConditionGroup> = [];
  for (const item of split.items) {
    const inner = outerGroupBody(item);
    if (inner !== null) {
      const group = parseGroup(inner, fields, operatorsForType, depth + 1, maximumDepth, maximumItems);
      if (!group) return null;
      items.push(group);
      continue;
    }
    const condition = parseCondition(item, fields, operatorsForType);
    if (!condition) return null;
    items.push(condition);
  }
  return { kind: 'group', join, items };
}

function parseCondition(
  expression: string,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType
): MetricAlertCondition | null {
  const exists = expression.match(/^(!?exists)\(\s*([A-Za-z_][A-Za-z0-9_.]*)\s*\)$/);
  if (exists?.[1] && exists[2]) {
    return parsedCondition(fields, operatorsForType, exists[2], exists[1] as MetricAlertConditionOperator, null);
  }
  const string = expression.match(
    /^(!?equals|!?contains|!?matches)\(\s*([A-Za-z_][A-Za-z0-9_.]*)\s*,\s*"([^"\\\r\n]+)"\s*\)$/
  );
  if (string?.[1] && string[2] && string[3]) {
    return parsedCondition(fields, operatorsForType, string[2], string[1] as MetricAlertConditionOperator, string[3]);
  }
  const numeric = expression.match(
    /^([A-Za-z_][A-Za-z0-9_.]*)\s*(>=|<=|==|!=|>|<)\s*(-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/
  );
  if (numeric?.[1] && numeric[2] && numeric[3]) {
    const value = Number(numeric[3]);
    if (!Number.isFinite(value)) return null;
    return parsedCondition(fields, operatorsForType, numeric[1], numeric[2] as MetricAlertConditionOperator, value);
  }
  return null;
}

function parsedCondition(
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType,
  fieldName: string,
  operator: MetricAlertConditionOperator,
  value: string | number | null
): MetricAlertCondition | null {
  const field = fields.get(fieldName);
  if (!field || !operatorsForType(field.type).includes(operator)) return null;
  return { kind: 'condition', field: fieldName, operator, value };
}

function splitLogical(source: string): { items: string[]; operators: Array<'and' | 'or'> } | null {
  const items: string[] = [];
  const operators: Array<'and' | 'or'> = [];
  let start = 0;
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if (depth < 0) return null;
    if (depth !== 0) continue;
    const operator = logicalOperatorAt(source, index);
    if (!operator) continue;
    const item = source.slice(start, index).trim();
    if (!item) return null;
    items.push(item);
    operators.push(operator);
    index += operator.length - 1;
    start = index + 1;
  }
  if (quote || depth !== 0) return null;
  const finalItem = source.slice(start).trim();
  if (!finalItem) return null;
  items.push(finalItem);
  return { items, operators };
}

function logicalOperatorAt(source: string, index: number): 'and' | 'or' | null {
  for (const operator of ['and', 'or'] as const) {
    if (
      source.startsWith(operator, index) &&
      /\s/.test(source[index - 1] ?? '') &&
      /\s/.test(source[index + operator.length] ?? '')
    ) {
      return operator;
    }
  }
  return null;
}

function unwrapOuterGroup(source: string) {
  let current = source.trim();
  let body = outerGroupBody(current);
  while (body !== null) {
    current = body;
    body = outerGroupBody(current);
  }
  return current;
}

function outerGroupBody(source: string): string | null {
  const value = source.trim();
  if (!value.startsWith('(') || !value.endsWith(')')) return null;
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]!;
    if (quote) {
      if (char === quote && value[index - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if (depth === 0 && index < value.length - 1) return null;
    if (depth < 0) return null;
  }
  return depth === 0 && !quote ? value.slice(1, -1).trim() : null;
}
