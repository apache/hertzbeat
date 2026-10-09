/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
