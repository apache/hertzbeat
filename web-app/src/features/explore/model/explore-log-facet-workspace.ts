/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogFacetField } from './explore-log-facets';

export type LogFacetWorkspace = {
  visible: boolean;
  toggle: () => void;
  availableFacetIds: string[];
  displayedFacetIds: string[];
  addedFacetIds: string[];
  expandedFacetIds: string[];
  setAvailableFacetIds: (ids: readonly string[]) => void;
  onAddFacet: (field: LogFacetField) => boolean;
  removeFacet: (id: string) => boolean;
  toggleFacet: (id: string) => void;
};
