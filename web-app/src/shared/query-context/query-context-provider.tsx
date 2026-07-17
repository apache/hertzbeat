/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useMemo, type PropsWithChildren } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  clearQueryContext,
  mergeQueryContext,
  parseQueryContext,
  queryContextScopeKey,
  writeQueryContext
} from './query-context-model';
import { QueryContextState, type QueryContextValue } from './query-context-context';

export function QueryContextProvider({ children }: PropsWithChildren) {
  const [params, setParams] = useSearchParams();
  const context = useMemo(() => parseQueryContext(params), [params]);
  const canonical = useMemo(() => writeQueryContext(params, context), [context, params]);
  const currentSearch = params.toString();
  const canonicalSearch = canonical.toString();

  useEffect(() => {
    if (currentSearch === canonicalSearch) return;
    // Router remains the only history owner; this replace only removes forbidden or non-canonical fields.
    setParams(canonical, { replace: true });
  }, [canonical, canonicalSearch, currentSearch, setParams]);

  const value = useMemo<QueryContextValue>(() => ({
    context,
    scopeKey: queryContextScopeKey(context),
    update: patch => setParams(writeQueryContext(params, mergeQueryContext(context, patch))),
    replace: next => setParams(writeQueryContext(params, next), { replace: true }),
    clearFrom: field => setParams(writeQueryContext(params, clearQueryContext(context, field)))
  }), [context, params, setParams]);

  return <QueryContextState.Provider value={value}>{children}</QueryContextState.Provider>;
}
