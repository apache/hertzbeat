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
  return (
    parseExistenceCondition(expression, fields, operatorsForType) ??
    parseStringCondition(expression, fields, operatorsForType) ??
    parseNumericCondition(expression, fields, operatorsForType)
  );
}

function parseExistenceCondition(
  expression: string,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType
) {
  const exists = expression.match(/^(!?exists)\(\s*([A-Za-z_][A-Za-z0-9_.]*)\s*\)$/);
  if (!exists?.[1] || !exists[2]) return null;
  return parsedCondition(fields, operatorsForType, exists[2], exists[1] as MetricAlertConditionOperator, null);
}

function parseStringCondition(
  expression: string,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType
) {
  const string = expression.match(
    /^(!?equals|!?contains|!?matches)\(\s*([A-Za-z_][A-Za-z0-9_.]*)\s*,\s*"([^"\\\r\n]+)"\s*\)$/
  );
  if (!string?.[1] || !string[2] || !string[3]) return null;
  return parsedCondition(fields, operatorsForType, string[2], string[1] as MetricAlertConditionOperator, string[3]);
}

function parseNumericCondition(
  expression: string,
  fields: Map<string, MetricAlertField>,
  operatorsForType: OperatorsForType
) {
  const numeric = expression.match(
    /^([A-Za-z_][A-Za-z0-9_.]*)\s*(>=|<=|==|!=|>|<)\s*(-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/
  );
  if (!numeric?.[1] || !numeric[2] || !numeric[3]) return null;
  const value = Number(numeric[3]);
  if (!Number.isFinite(value)) return null;
  return parsedCondition(fields, operatorsForType, numeric[1], numeric[2] as MetricAlertConditionOperator, value);
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
  const state = createLogicalScanState();
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    advanceLogicalScanState(state, char);
    if (state.depth < 0) return null;
    if (state.quote || state.depth !== 0) continue;
    const operator = logicalOperatorAt(source, index);
    if (!operator) continue;
    const item = source.slice(start, index).trim();
    if (!item) return null;
    items.push(item);
    operators.push(operator);
    index += operator.length - 1;
    start = index + 1;
  }
  if (state.quote || state.depth !== 0) return null;
  const finalItem = source.slice(start).trim();
  if (!finalItem) return null;
  items.push(finalItem);
  return { items, operators };
}

type LogicalScanState = {
  depth: number;
  quote: '"' | "'" | null;
  escaped: boolean;
};

function createLogicalScanState(): LogicalScanState {
  return { depth: 0, quote: null, escaped: false };
}

function advanceLogicalScanState(state: LogicalScanState, char: string) {
  if (state.quote) {
    if (state.escaped) state.escaped = false;
    else if (char === '\\') state.escaped = true;
    else if (char === state.quote) state.quote = null;
    return;
  }
  if (char === '"' || char === "'") state.quote = char;
  else if (char === '(') state.depth += 1;
  else if (char === ')') state.depth -= 1;
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
  const state = createLogicalScanState();
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]!;
    advanceOuterGroupScanState(state, char, value[index - 1]);
    if (state.depth === 0 && index < value.length - 1) return null;
    if (state.depth < 0) return null;
  }
  return state.depth === 0 && !state.quote ? value.slice(1, -1).trim() : null;
}

function advanceOuterGroupScanState(state: LogicalScanState, char: string, previous: string | undefined) {
  if (state.quote) {
    if (char === state.quote && previous !== '\\') state.quote = null;
    return;
  }
  if (char === '"' || char === "'") state.quote = char;
  else if (char === '(') state.depth += 1;
  else if (char === ')') state.depth -= 1;
}
