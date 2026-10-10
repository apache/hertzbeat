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

import { useEffect, useMemo, type PropsWithChildren } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

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
  const location = useLocation();
  const routeState = location.state as unknown;
  const context = useMemo(() => parseQueryContext(params), [params]);
  const canonical = useMemo(() => writeQueryContext(params, context), [context, params]);
  const currentSearch = params.toString();
  const canonicalSearch = canonical.toString();

  useEffect(() => {
    if (currentSearch === canonicalSearch) return;
    // Router remains the only history owner; this replace only removes forbidden or non-canonical fields.
    setParams(canonical, { replace: true, state: routeState });
  }, [canonical, canonicalSearch, currentSearch, routeState, setParams]);

  const value = useMemo<QueryContextValue>(
    () => ({
      context,
      scopeKey: queryContextScopeKey(context),
      update: patch => setParams(writeQueryContext(params, mergeQueryContext(context, patch))),
      replace: next => setParams(writeQueryContext(params, next), { replace: true }),
      clearFrom: field => setParams(writeQueryContext(params, clearQueryContext(context, field)))
    }),
    [context, params, setParams]
  );

  return <QueryContextState.Provider value={value}>{children}</QueryContextState.Provider>;
}
