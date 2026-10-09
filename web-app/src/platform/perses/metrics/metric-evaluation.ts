/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { evaluateMetricFormula, parseMetricFormula, type MetricFormulaNode } from './metric-formula';
import type { MetricPlan } from './metric-plan';
import type { MetricFormulaResult, MetricSourceResult } from './metric-composition';
import { metricPoints, type MetricSeries } from './metric-series';

export function evaluateMetricComposition(plan: MetricPlan, sources: MetricSourceResult[]): MetricFormulaResult[] {
  return plan.formulas.map(formula => {
    const { ast, references } = parseMetricFormula(formula.expression);
    const dependencies = references.map(ref => sources.find(source => source.refId === ref));
    const base = { id: formula.id, expression: formula.expression, series: [] };
    if (dependencies.some(source => !source || source.state !== 'ready'))
      return { ...base, state: 'unavailable', reason: 'source' };
    const groups = references.map(ref => normalizedGrouping(plan.queries.find(row => row.refId === ref)?.groupBy));
    if (new Set(groups).size > 1) return { ...base, state: 'unavailable', reason: 'grouping' };
    const inputs = dependencies.filter((source): source is MetricSourceResult => Boolean(source));
    if (!inputs.length) inputs.push(...sources.filter(source => source.state === 'ready').slice(0, 1));
    const matched = matchSeries(inputs);
    if (!matched?.length) return { ...base, state: 'empty', reason: 'labels' };
    const evaluated = matched.map((series, index) => evaluateGroup(formula.id, ast, references, series, index));
    if (evaluated.some(item => item === null)) return { ...base, state: 'unavailable', reason: 'unit' };
    const series = evaluated.filter((item): item is MetricSeries => item !== null);
    return {
      ...base,
      state: series.some(item => metricPoints(item).length > 0) ? 'ready' : 'empty',
      series,
      ...(series.some(item => item.points.some(point => point[1] === null)) ? { reason: 'samples' as const } : {})
    };
  });
}
function normalizedGrouping(value?: string) {
  return [
    ...new Set(
      (value ?? '')
        .split(',')
        .map(key => key.trim())
        .filter(Boolean)
    )
  ]
    .sort()
    .join(',');
}
function labelIdentity(series: MetricSeries) {
  return JSON.stringify(
    Object.entries(series.labels)
      .filter(([key]) => key !== '__name__')
      .sort(([a], [b]) => a.localeCompare(b))
  );
}
function matchSeries(sources: MetricSourceResult[]) {
  const indexes = sources.map(source => {
    const index = new Map<string, MetricSeries[]>();
    for (const series of source.series) {
      const key = labelIdentity(series);
      index.set(key, [...(index.get(key) ?? []), series]);
    }
    return index;
  });
  if (indexes.some(index => [...index.values()].some(series => series.length !== 1))) return undefined;
  return [...new Set(indexes.flatMap(index => [...index.keys()]))]
    .sort()
    .map(key => indexes.map(index => index.get(key)?.[0]));
}
function evaluateGroup(
  id: string,
  ast: MetricFormulaNode,
  refs: string[],
  inputs: Array<MetricSeries | undefined>,
  index: number
): MetricSeries | null {
  const units = Object.fromEntries(inputs.map((series, i) => [refs[i] ?? '', series?.unit]));
  const unit = formulaUnit(ast, units);
  if (unit === false) return null;
  const maps = inputs.map(
    series => new Map((series ? metricPoints(series) : []).map(point => [point.timestamp, point.value]))
  );
  const timestamps = [...new Set(maps.flatMap(map => [...map.keys()]))].sort((a, b) => a - b);
  const points = timestamps.map(timestamp => {
    const values = Object.fromEntries(refs.map((ref, i) => [ref, maps[i]?.get(timestamp) ?? null]));
    return [timestamp, evaluateMetricFormula(ast, values)];
  });
  return {
    key: `${id}-${index}`,
    refId: id,
    name: id,
    labels: Object.fromEntries(Object.entries(inputs.find(Boolean)!.labels).filter(([key]) => key !== '__name__')),
    unit,
    points,
    allowsGaps: true
  };
}
function formulaUnit(node: MetricFormulaNode, units: Record<string, string | undefined>): string | undefined | false {
  if (node.kind === 'number') return undefined;
  if (node.kind === 'ref') return units[node.name];
  if (node.kind === 'unary') return formulaUnit(node.operand, units);
  if (node.kind === 'function') {
    const input = formulaUnit(node.operand, units);
    if (input === false) return false;
    return node.name === 'abs' ? input : undefined;
  }
  const left = formulaUnit(node.left, units);
  const right = formulaUnit(node.right, units);
  if (left === false || right === false) return false;
  return combinedUnit(node, left, right);
}
function combinedUnit(
  node: Extract<MetricFormulaNode, { kind: 'binary' }>,
  left: string | undefined,
  right: string | undefined
) {
  if (node.operator === 'pow') return powerUnit(node.right, left);
  if (['+', '-', 'minimum', 'maximum'].includes(node.operator)) {
    if (left && right && left !== right) return false;
    return left && left === right ? left : undefined;
  }
  if (node.right.kind === 'number') return left;
  if (node.operator === '*' && node.left.kind === 'number') return right;
  return undefined;
}

function powerUnit(exponent: MetricFormulaNode, base: string | undefined) {
  return exponent.kind === 'number' && exponent.value === 1 ? base : undefined;
}
