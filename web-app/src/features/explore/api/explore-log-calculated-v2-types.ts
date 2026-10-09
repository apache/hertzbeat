/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogCalculatedV2 } from '../model/explore-log-calculated-v2';

type Definitions = { version: 2; fields: LogCalculatedV2['fields'] };

export type CalculatedPageRequest = {
  version: 2;
  parameters: Record<string, string>;
  calculatedFields: Definitions;
  operation: {
    kind: 'page';
    pageIndex: number;
    pageSize: number;
    sort: { field: string; direction: 'asc' | 'desc'; type?: 'number' | 'text' };
  };
};

export type CalculatedTrendRequest = {
  version: 2;
  parameters: Record<string, string>;
  calculatedFields: Definitions;
  operation: { kind: 'trend'; intervalMs: number };
};

export type CalculatedFacetRequest = {
  version: 2;
  parameters: Record<string, string>;
  calculatedFields: Definitions;
  operation: { kind: 'facet'; field: string; limit: number; valueSearch?: string };
};

export type CalculatedValidationRequest = {
  version: 2;
  calculatedFields: Definitions;
  preview?: { definitionId: string; sourceText: string };
};

export type CalculatedAnalysisRequest = {
  version: 2;
  parameters: Record<string, string>;
  calculatedFields: Definitions;
  operation: {
    kind: 'analysis';
    view: 'groups' | 'timeseries';
    grouping: Array<{ field: string; limit: number }>;
    measure: { function: string; field: string } | null;
    limit: number;
    order: 'count-asc' | 'count-desc' | 'measure-asc' | 'measure-desc';
    minCount: number;
    intervalMs?: number;
  };
};
