/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export type CalculatedAnalysisResponse = {
  version: 1 | 2;
  window: { start: number; end: number };
  executed: {
    parameters: Record<string, string>;
    calculatedFields?: {
      version: 2;
      fields: Array<{
        id: string;
        kind: 'formula' | 'extraction';
        outputs: Array<{ name: string; type: 'number' | 'string' | 'boolean' }>;
      }>;
    };
    operation: {
      kind: 'analysis';
      view: 'groups' | 'timeseries';
      grouping: Array<{ field: string; limit: number }>;
      measure: { function: string; field: string } | null;
      limit: number;
      order: 'count-asc' | 'count-desc' | 'measure-asc' | 'measure-desc';
      minCount: number;
      intervalMs?: number | undefined;
    };
  };
  result: {
    kind: 'analysis';
    view: 'groups' | 'timeseries';
    matchingTotal: number;
    truncated: boolean;
    intervalMs: number | null;
    groups: Array<{
      keys: Array<{ field: string; kind: 'value' | 'null' | 'all'; value: string | number | boolean | null }>;
      count: number;
      measurement: { state: 'ready' | 'no_samples' | 'non_finite'; sampleCount: number; value: number | null } | null;
      buckets: Array<{
        start: number;
        count: number;
        measurement: { state: 'ready' | 'no_samples' | 'non_finite'; sampleCount: number; value: number | null } | null;
      }>;
    }>;
  };
};
