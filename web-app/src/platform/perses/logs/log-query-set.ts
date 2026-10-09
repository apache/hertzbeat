/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { parseQueryFormula } from '@/shared/query-context/query-formula';
import { groupingLimit, logGroupingSchema } from './log-grouping';
import {
  logAnalysisFieldIdSchema,
  logAnalysisOrderSchema,
  optionalLogMeasureSchema,
  validMeasureOrder
} from './log-measure';
import { logTimeShiftSchema } from './log-timeshift';
import type { LogComparison } from './log-comparison';

const logQuerySourceAnalysisDraftSchema = z
  .object({
    field: logAnalysisFieldIdSchema.optional(),
    grouping: logGroupingSchema.optional(),
    measure: optionalLogMeasureSchema.nullable().optional(),
    limit: z.number().int().min(1).max(100),
    order: logAnalysisOrderSchema,
    minCount: z.number().int().min(1).max(1_000_000),
    transform: z.literal('throughput').optional()
  })
  .strict();

export const logQuerySourceAnalysisSchema = logQuerySourceAnalysisDraftSchema
  .refine(value => value.limit <= 25)
  .refine(value => !(value.field && value.grouping))
  .refine(value => !value.grouping || value.limit === groupingLimit(value.grouping))
  .refine(value => validMeasureOrder({ ...value, measure: value.measure ?? undefined }));

export const logQuerySourceSchema = z
  .object({
    refId: z.string().regex(/^[a-z]$/u),
    alias: z.string().max(64),
    visible: z.boolean(),
    searchSyntax: z.literal('structured-v1').optional(),
    search: z.string().optional(),
    timeShiftMs: z.union([z.literal(0), logTimeShiftSchema]).optional(),
    analysis: logQuerySourceAnalysisSchema
  })
  .strict()
  .refine(value => (value.search?.length ?? 0) <= (value.searchSyntax ? 8192 : 512));

const logQuerySourceDraftSchema = logQuerySourceSchema.safeExtend({ analysis: logQuerySourceAnalysisDraftSchema });

const logQueryFormulaFunctionSchema = z.discriminatedUnion('name', [
  z.object({ name: z.enum(['abs', 'log2', 'log10', 'cumsum', 'integral']) }).strict(),
  z.object({ name: z.literal('pow'), exponent: z.number().finite().min(-16).max(16) }).strict()
]);

export const logQueryFormulaSchema = z
  .object({
    refId: z.string().regex(/^f(?:[1-9][0-9]{0,3})$/u),
    alias: z.string().max(64),
    visible: z.boolean(),
    expression: z.string().max(256),
    functions: z.array(logQueryFormulaFunctionSchema).max(8).optional()
  })
  .strict();

export const logQuerySetDraftSchema = z
  .object({
    version: z.literal(2),
    queries: z.array(logQuerySourceDraftSchema).min(1).max(4),
    formulas: z.array(logQueryFormulaSchema).max(4),
    nextSourceOrdinal: z.number().int().min(1).max(26),
    nextFormulaSeq: z.number().int().min(1).max(10000)
  })
  .strict();

export type LogQuerySet = z.infer<typeof logQuerySetDraftSchema>;
export type LogQuerySource = LogQuerySet['queries'][number];
export type LogQueryFormula = LogQuerySet['formulas'][number];
type MigrationState = LogQuerySource['analysis'] & {
  comparison?: LogComparison | undefined;
  additionalMeasures?: unknown[] | undefined;
};

function groupingSignature(source: LogQuerySource) {
  return JSON.stringify(
    source.analysis.grouping?.dimensions.map(item => item.field) ??
      (source.analysis.field ? [source.analysis.field] : [])
  );
}

export function validLogQuerySet(value: LogQuerySet) {
  if (!logQuerySetDraftSchema.safeParse(value).success) return false;
  if (value.queries.some(query => !logQuerySourceSchema.safeParse(query).success)) return false;
  const sourceIds = value.queries.map(query => query.refId);
  const formulaIds = value.formulas.map(formula => formula.refId);
  if (
    new Set(sourceIds).size !== sourceIds.length ||
    new Set(formulaIds).size !== formulaIds.length ||
    sourceIds.some(id => id.charCodeAt(0) - 97 >= value.nextSourceOrdinal) ||
    formulaIds.some(id => Number(id.slice(1)) >= value.nextFormulaSeq)
  )
    return false;
  if ([...value.queries, ...value.formulas].some(item => !validAlias(item.alias))) return false;
  return value.formulas.every(formula => {
    try {
      const refs = parseQueryFormula(formula.expression).references;
      if (refs.some(ref => !sourceIds.includes(ref))) return false;
      return new Set(refs.map(ref => groupingSignature(value.queries.find(source => source.refId === ref)!))).size <= 1;
    } catch {
      return false;
    }
  });
}

export function hasIncompatibleFormulaGrouping(value: LogQuerySet) {
  return value.formulas.some(formula => {
    try {
      const refs = parseQueryFormula(formula.expression).references;
      const sources = refs.map(ref => value.queries.find(source => source.refId === ref));
      return sources.every(Boolean) && new Set(sources.map(source => groupingSignature(source!))).size > 1;
    } catch {
      return false;
    }
  });
}

function validAlias(alias: string) {
  return (
    Boolean(alias.trim()) &&
    [...alias].length <= 64 &&
    ![...alias].some(character => {
      const code = character.codePointAt(0)!;
      return code <= 31 || (code >= 127 && code <= 159);
    })
  );
}

export const logQuerySetSchema = logQuerySetDraftSchema.refine(validLogQuerySet);

export function addLogSource(value: LogQuerySet): LogQuerySet {
  if (value.queries.length >= 4 || value.nextSourceOrdinal >= 26) return value;
  const source = value.queries.at(-1)!;
  const template = { ...source };
  const refId = String.fromCharCode(97 + value.nextSourceOrdinal);
  return {
    ...value,
    queries: [...value.queries, { ...template, refId, alias: refId, visible: true }],
    nextSourceOrdinal: value.nextSourceOrdinal + 1
  };
}

export function removeLogSource(value: LogQuerySet, refId: string): LogQuerySet {
  if (
    value.queries.length === 1 ||
    value.formulas.some(formula => {
      try {
        return parseQueryFormula(formula.expression).references.includes(refId);
      } catch {
        return true;
      }
    })
  )
    return value;
  return { ...value, queries: value.queries.filter(source => source.refId !== refId) };
}

export function addLogFormula(value: LogQuerySet): LogQuerySet {
  if (value.formulas.length >= 4 || value.nextFormulaSeq > 9999) return value;
  const refId = `f${value.nextFormulaSeq}`;
  return {
    ...value,
    formulas: [...value.formulas, { refId, alias: refId, visible: true, expression: value.queries[0]!.refId }],
    nextFormulaSeq: value.nextFormulaSeq + 1
  };
}

export function migrateLogQuerySet(state: MigrationState, search: string, searchSyntax?: string): LogQuerySet {
  if (!canMigrateLogQuerySet(state)) throw new Error('Log analysis grouping exceeds the query-set limit');
  const analysis = sourceAnalysis(state);
  const comparison = state.comparison;
  const sourceA: LogQuerySource = {
    refId: 'a',
    alias: 'a',
    visible: sourceVisible(comparison, 'a'),
    search,
    ...(searchSyntax === 'structured-v1' ? { searchSyntax } : {}),
    analysis
  };
  const sourceB = comparison?.search === undefined ? undefined : comparisonSourceB(comparison, analysis);
  return {
    version: 2,
    queries: sourceB ? [sourceA, sourceB] : [sourceA],
    formulas: comparison?.formula === undefined ? [] : [comparisonFormula(comparison)],
    nextSourceOrdinal: sourceB ? 2 : 1,
    nextFormulaSeq: comparison?.formula === undefined ? 1 : 2
  };
}

function sourceVisible(comparison: LogComparison | undefined, refId: 'a' | 'b' | 'formula') {
  return !comparison?.hidden?.includes(refId);
}

function comparisonFormula(comparison: LogComparison) {
  return {
    refId: 'f1',
    alias: 'f1',
    visible: sourceVisible(comparison, 'formula'),
    expression: comparison.formula!
  };
}

function sourceAnalysis(state: MigrationState) {
  return {
    ...(state.field ? { field: state.field } : {}),
    ...(state.grouping ? { grouping: state.grouping } : {}),
    ...(state.measure ? { measure: state.measure } : {}),
    ...(state.transform ? { transform: state.transform } : {}),
    limit: Math.min(state.limit, 25),
    order: state.order,
    minCount: state.minCount
  };
}

function comparisonSourceB(comparison: LogComparison, analysis: ReturnType<typeof sourceAnalysis>): LogQuerySource {
  return {
    refId: 'b',
    alias: 'b',
    visible: sourceVisible(comparison, 'b'),
    search: comparison.search ?? '',
    ...(comparison.searchSyntax ? { searchSyntax: comparison.searchSyntax } : {}),
    ...(comparison.timeShiftMs ? { timeShiftMs: comparison.timeShiftMs } : {}),
    analysis
  };
}

export function canMigrateLogQuerySet(state: MigrationState) {
  return !state.additionalMeasures?.length && (!state.grouping || groupingLimit(state.grouping) <= 25);
}
