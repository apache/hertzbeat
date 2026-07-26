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

import { hasUnsafeAlertRuleSourceCharacter } from './alert-rule-source-safety';
import { AlertRuleContractError } from './alert-rule-types';

export type RealtimeMetricTarget =
  { kind: 'metric'; app: string; metric: string } | { kind: 'availability'; app: string };

export type RealtimeMetricExpressionContext = {
  target: RealtimeMetricTarget;
  monitorIds: number[];
  monitorLabels: string[];
  condition: string;
};

export type RealtimeMetricBindings = Pick<RealtimeMetricExpressionContext, 'monitorIds' | 'monitorLabels'>;

const reservedContextPattern = /__(?:app|metrics|available|instance|labels)__/;
const appClausePattern = /^equals\(\s*__app__\s*,\s*"([^"\\\r\n]+)"\s*\)$/;
const metricClausePattern = /^equals\(\s*__metrics__\s*,\s*"([^"\\\r\n]+)"\s*\)$/;
const availabilityClausePattern = /^equals\(\s*__available__\s*,\s*"down"\s*\)$/;
const monitorClausePattern = /^equals\(\s*__instance__\s*,\s*"([1-9]\d*)"\s*\)$/;
const labelClausePattern = /^contains\(\s*__labels__\s*,\s*"([^"\\\r\n]+)"\s*\)$/;
const maximumAlertExpressionLength = 2048;

/**
 * Builds the persisted realtime-metric expression from explicit editor state.
 * Reserved target clauses stay separate from the operator-authored threshold.
 */
export function buildRealtimeMetricExpression(context: RealtimeMetricExpressionContext) {
  const app = reservedValue(context.target.app, 'application');
  const target =
    context.target.kind === 'availability'
      ? [`equals(__app__,"${app}")`, 'equals(__available__,"down")']
      : [`equals(__app__,"${app}")`, `equals(__metrics__,"${reservedValue(context.target.metric, 'metric')}")`];
  const condition = context.condition.trim();
  if (context.target.kind === 'availability' && condition) {
    throw contract('availability target cannot have a threshold');
  }
  if (context.target.kind === 'metric' && !condition) {
    throw contract('metric target requires a threshold');
  }

  const { monitorIds, monitorLabels } = normalizeRealtimeMetricBindings(context.monitorIds, context.monitorLabels);
  const clauses = [
    ...target,
    bindingClause(monitorIds.map(id => `equals(__instance__, "${id}")`)),
    bindingClause(monitorLabels.map(label => `contains(__labels__, "${label}")`)),
    condition
  ].filter(Boolean);
  const expression = clauses.join(' && ');
  if (expression.length > maximumAlertExpressionLength) throw contract('realtime metric expression is too long');
  return expression;
}

export function normalizeRealtimeMetricBindings(monitorIds: number[], monitorLabels: string[]): RealtimeMetricBindings {
  return {
    monitorIds: uniqueMonitorIds(monitorIds),
    monitorLabels: uniqueReservedValues(monitorLabels, 'monitor label')
  };
}

/**
 * Separates a persisted expression only when every reserved clause is
 * unambiguous. Callers can fall back to expert mode when this returns null.
 */
export function parseRealtimeMetricExpression(expression: string): RealtimeMetricExpressionContext | null {
  const source = expression.trim();
  if (!source || source.length > maximumAlertExpressionLength) return null;
  const clauses = splitTopLevel(source, '&&');
  if (!clauses) return null;

  let app: string | undefined;
  let metric: string | undefined;
  let availability = false;
  let monitorIds: number[] = [];
  let monitorLabels: string[] = [];
  const condition: string[] = [];

  for (const clause of clauses) {
    const appMatch = clause.match(appClausePattern);
    if (appMatch) {
      if (app !== undefined) return null;
      app = appMatch[1];
      continue;
    }
    const metricMatch = clause.match(metricClausePattern);
    if (metricMatch) {
      if (metric !== undefined || availability) return null;
      metric = metricMatch[1];
      continue;
    }
    if (availabilityClausePattern.test(clause)) {
      if (availability || metric !== undefined) return null;
      availability = true;
      continue;
    }
    if (clause.includes('__instance__')) {
      if (monitorIds.length > 0) return null;
      const parsed = parseBindingGroup(clause, monitorClausePattern, value => Number(value));
      if (!parsed || parsed.some(id => !Number.isSafeInteger(id) || id <= 0)) return null;
      monitorIds = uniqueSorted(parsed);
      continue;
    }
    if (clause.includes('__labels__')) {
      if (monitorLabels.length > 0) return null;
      const parsed = parseBindingGroup(clause, labelClausePattern, value => value);
      if (!parsed) return null;
      monitorLabels = uniqueSorted(parsed);
      continue;
    }
    if (reservedContextPattern.test(clause)) return null;
    condition.push(clause);
  }

  if (!app || availability === (metric !== undefined)) return null;
  const threshold = condition.join(' && ').trim();
  if (availability && threshold) return null;
  if (!availability && !threshold) return null;
  return {
    target: availability ? { kind: 'availability', app } : { kind: 'metric', app, metric: metric! },
    monitorIds,
    monitorLabels,
    condition: threshold
  };
}

function parseBindingGroup<T>(clause: string, itemPattern: RegExp, convert: (value: string) => T): T[] | null {
  const body = unwrapGroup(clause);
  const items = splitTopLevel(body, 'or');
  if (!items || items.length === 0) return null;
  const result: T[] = [];
  for (const item of items) {
    const match = item.match(itemPattern);
    if (!match?.[1]) return null;
    result.push(convert(match[1]));
  }
  return result;
}

function splitTopLevel(source: string, operator: '&&' | 'or'): string[] | null {
  const result: string[] = [];
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
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth < 0) return null;
    }
    if (depth === 0 && source.startsWith(operator, index) && hasOperatorBoundary(source, operator, index)) {
      const item = source.slice(start, index).trim();
      if (!item) return null;
      result.push(item);
      index += operator.length - 1;
      start = index + 1;
    }
  }
  if (quote || depth !== 0) return null;
  const finalItem = source.slice(start).trim();
  if (!finalItem) return null;
  result.push(finalItem);
  return result;
}

function hasOperatorBoundary(source: string, operator: '&&' | 'or', index: number) {
  if (operator === '&&') return true;
  return /\s/.test(source[index - 1] ?? '') && /\s/.test(source[index + operator.length] ?? '');
}

function unwrapGroup(value: string) {
  const source = value.trim();
  if (!source.startsWith('(') || !source.endsWith(')')) return source;
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (quote) {
      if (char === quote && source[index - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if (depth === 0 && index < source.length - 1) return source;
  }
  return source.slice(1, -1).trim();
}

function bindingClause(items: string[]) {
  if (items.length === 0) return '';
  return items.length === 1 ? items[0]! : `(${items.join(' or ')})`;
}

function reservedValue(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized || hasUnsafeAlertRuleSourceCharacter(normalized)) throw contract(`${field} is invalid`);
  return normalized;
}

function uniqueReservedValues(values: string[], field: string) {
  return uniqueSorted(values.map(value => reservedValue(value, field)));
}

function uniqueMonitorIds(values: number[]) {
  if (values.some(value => !Number.isSafeInteger(value) || value <= 0)) throw contract('monitor id is invalid');
  return uniqueSorted(values);
}

function uniqueSorted<T extends number | string>(values: T[]) {
  return [...new Set(values)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function contract(message: string) {
  return new AlertRuleContractError(message);
}
