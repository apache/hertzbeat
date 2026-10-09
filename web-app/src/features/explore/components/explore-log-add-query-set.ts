/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { DEFAULT_LOG_ANALYSIS, addLogFormula, addLogSource, migrateLogQuerySet } from '@/platform/perses';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';

export function writeQuerySet(
  raw: string | undefined,
  query: string,
  searchSyntax: string | undefined,
  kind: 'query' | 'formula',
  onChange: (raw: string) => void,
  onQueryChange: ((query: string) => void) | undefined
) {
  const base = readLogAnalysisDraft(raw) ?? DEFAULT_LOG_ANALYSIS;
  const current = base.querySet ?? migrateLogQuerySet(base, query, searchSyntax);
  const next = kind === 'query' ? addLogSource(current) : addLogFormula(current);
  const rest = { ...base };
  delete rest.comparison;
  onChange(JSON.stringify({ ...rest, representation: 'timeseries', querySet: next }));
  if (!base.querySet) onQueryChange?.('');
}
