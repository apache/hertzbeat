/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
