/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { createContext, useContext } from 'react';

import type { QueryContext, QueryContextField } from './query-context-model';

export type QueryContextValue = {
  context: QueryContext;
  scopeKey: string;
  update: (patch: Partial<QueryContext>) => void;
  replace: (context: QueryContext) => void;
  clearFrom: (field: QueryContextField) => void;
};

export const QueryContextState = createContext<QueryContextValue | null>(null);

export function useQueryContext() {
  const value = useContext(QueryContextState);
  if (!value) throw new Error('QueryContextProvider is missing');
  return value;
}

export function useQueryContextOptional() {
  return useContext(QueryContextState);
}
