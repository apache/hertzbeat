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

import { useState, type ReactNode } from 'react';
import type { LogRow } from '../model/explore-signal-contract';
import { LogCalculatedFromFieldContext } from './explore-log-calculated-from-field-context';

export function LogCalculatedFromFieldProvider({
  children,
  enabled,
  identity
}: {
  children: ReactNode;
  enabled: boolean;
  identity: string;
}) {
  const [state, setState] = useState<{
    identity: string;
    request: { expression: string; row?: LogRow } | undefined;
  }>({ identity, request: undefined });
  if (state.identity !== identity) setState({ identity, request: undefined });
  const request = state.identity === identity ? state.request : undefined;
  return (
    <LogCalculatedFromFieldContext.Provider
      value={{
        enabled,
        identity,
        request,
        open: (expression, row) => setState({ identity, request: { expression, ...(row ? { row } : {}) } }),
        clear: () => setState({ identity, request: undefined })
      }}
    >
      {children}
    </LogCalculatedFromFieldContext.Provider>
  );
}
