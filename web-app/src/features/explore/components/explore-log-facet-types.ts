/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogFacetField, LogFacetFieldsResult, LogFacetValuesResult } from '../model/explore-log-facets';
import type { FacetRead } from './explore-log-facet-state';
import type { ReactNode } from 'react';

export type FacetValueAction = (
  field: LogFacetField,
  value: string,
  operator: '=' | '!=',
  intent?: 'single' | 'toggle'
) => {
  disabled: boolean;
  selected: boolean;
  onClick: () => void;
  reason?: 'legacy-value' | 'literal-query-exclusion' | 'pending-query' | undefined;
};

export type ExploreLogFacetsProps = {
  fields: FacetRead<LogFacetFieldsResult>;
  onCatalogRetry: () => void;
  renderValues: (fieldId: string, fieldLabel: string) => ReactNode;
  extraFields?: Array<{ id: string; label: string }> | undefined;
};

export type FacetValuesProps = {
  fieldId: string;
  fieldLabel: string;
  values: FacetRead<LogFacetValuesResult>;
  valueSearch: string;
  onValueSearchChange: (value: string) => void;
  onRetry: () => void;
  actionForValue: FacetValueAction;
};
