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

import { splitAlertRuleExpressionTopLevel, unwrapAlertRuleExpressionGroup } from './alert-rule-expression-scanner';
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
  const clauses = splitAlertRuleExpressionTopLevel(source, '&&');
  if (!clauses) return null;

  const state = createRealtimeMetricParseState();
  for (const clause of clauses) {
    const outcome = consumeRealtimeMetricClause(clause, state);
    if (outcome === 'invalid') return null;
    if (outcome === 'condition') state.condition.push(clause);
  }
  return completeRealtimeMetricContext(state);
}

type RealtimeMetricParseState = {
  app: string | undefined;
  metric: string | undefined;
  availability: boolean;
  monitorIds: number[];
  monitorLabels: string[];
  condition: string[];
};

type ClauseOutcome = 'accepted' | 'condition' | 'invalid' | 'unmatched';

function createRealtimeMetricParseState(): RealtimeMetricParseState {
  return {
    app: undefined,
    metric: undefined,
    availability: false,
    monitorIds: [],
    monitorLabels: [],
    condition: []
  };
}

function consumeRealtimeMetricClause(clause: string, state: RealtimeMetricParseState): ClauseOutcome {
  const consumers = [
    consumeApplicationClause,
    consumeMetricClause,
    consumeAvailabilityClause,
    consumeMonitorClause,
    consumeLabelClause
  ] as const;
  for (const consume of consumers) {
    const outcome = consume(clause, state);
    if (outcome !== 'unmatched') return outcome;
  }
  return reservedContextPattern.test(clause) ? 'invalid' : 'condition';
}

function consumeApplicationClause(clause: string, state: RealtimeMetricParseState): ClauseOutcome {
  const match = clause.match(appClausePattern);
  if (!match) return 'unmatched';
  if (state.app !== undefined) return 'invalid';
  state.app = match[1];
  return 'accepted';
}

function consumeMetricClause(clause: string, state: RealtimeMetricParseState): ClauseOutcome {
  const match = clause.match(metricClausePattern);
  if (!match) return 'unmatched';
  if (state.metric !== undefined || state.availability) return 'invalid';
  state.metric = match[1];
  return 'accepted';
}

function consumeAvailabilityClause(clause: string, state: RealtimeMetricParseState): ClauseOutcome {
  if (!availabilityClausePattern.test(clause)) return 'unmatched';
  if (state.availability || state.metric !== undefined) return 'invalid';
  state.availability = true;
  return 'accepted';
}

function consumeMonitorClause(clause: string, state: RealtimeMetricParseState): ClauseOutcome {
  if (!clause.includes('__instance__')) return 'unmatched';
  if (state.monitorIds.length > 0) return 'invalid';
  const parsed = parseBindingGroup(clause, monitorClausePattern, value => Number(value));
  if (!parsed || parsed.some(id => !Number.isSafeInteger(id) || id <= 0)) return 'invalid';
  state.monitorIds = uniqueSorted(parsed);
  return 'accepted';
}

function consumeLabelClause(clause: string, state: RealtimeMetricParseState): ClauseOutcome {
  if (!clause.includes('__labels__')) return 'unmatched';
  if (state.monitorLabels.length > 0) return 'invalid';
  const parsed = parseBindingGroup(clause, labelClausePattern, value => value);
  if (!parsed) return 'invalid';
  state.monitorLabels = uniqueSorted(parsed);
  return 'accepted';
}

function completeRealtimeMetricContext(state: RealtimeMetricParseState): RealtimeMetricExpressionContext | null {
  if (!state.app || state.availability === (state.metric !== undefined)) return null;
  const threshold = state.condition.join(' && ').trim();
  if (state.availability) {
    if (threshold) return null;
    return {
      target: { kind: 'availability', app: state.app },
      monitorIds: state.monitorIds,
      monitorLabels: state.monitorLabels,
      condition: threshold
    };
  }
  if (!state.metric || !threshold) return null;
  return {
    target: { kind: 'metric', app: state.app, metric: state.metric },
    monitorIds: state.monitorIds,
    monitorLabels: state.monitorLabels,
    condition: threshold
  };
}

function parseBindingGroup<T>(clause: string, itemPattern: RegExp, convert: (value: string) => T): T[] | null {
  const body = unwrapAlertRuleExpressionGroup(clause);
  const items = splitAlertRuleExpressionTopLevel(body, 'or');
  if (!items || items.length === 0) return null;
  const result: T[] = [];
  for (const item of items) {
    const match = item.match(itemPattern);
    if (!match?.[1]) return null;
    result.push(convert(match[1]));
  }
  return result;
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
