/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { parseLogAnalysis, type LogAnalysisState } from '@/platform/perses';

export function calculatedAnalysisFields(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    return analysisFields(parseLogAnalysis(raw));
  } catch {
    return [];
  }
}

function validCalculatedAnalysisContext(raw: string, outputNames: string[]): boolean {
  try {
    const analysis = parseLogAnalysis(raw);
    if (analysis.comparison || analysis.querySet || analysis.additionalMeasures?.length || analysis.transform)
      return false;
    const outputs = new Set(outputNames);
    return analysisFields(analysis).every(field => outputs.has(field.slice('calculated:'.length)));
  } catch {
    return false;
  }
}

export function validCalculatedQueryContext(
  query: {
    searchSyntax?: string | undefined;
    logCalculated?: string | undefined;
    logAggregation?: string | undefined;
    logAnalysis?: string | undefined;
  },
  outputNames: string[]
) {
  if (query.searchSyntax !== 'structured-v2' || query.logCalculated !== undefined) return false;
  if (query.logAggregation && query.logAggregation !== 'fields') return false;
  return !query.logAnalysis || validCalculatedAnalysisContext(query.logAnalysis, outputNames);
}

export function validCalculatedSort(outputNames: string[], field: string | undefined) {
  return !field?.startsWith('calculated:') || outputNames.includes(field.slice('calculated:'.length));
}

function analysisFields(analysis: LogAnalysisState): string[] {
  return [
    analysis.field,
    analysis.measure?.field,
    ...(analysis.grouping?.dimensions.map(item => item.field) ?? [])
  ].filter((field): field is string => field?.startsWith('calculated:') ?? false);
}
