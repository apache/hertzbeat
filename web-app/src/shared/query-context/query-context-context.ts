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
