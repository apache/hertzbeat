/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { createContext, useContext } from 'react';
import type { LogRow } from '../model/explore-signal-contract';

export type ContextValue = {
  enabled: boolean;
  identity: string;
  request: { expression: string; row?: LogRow } | undefined;
  open: (expression: string, row?: LogRow) => void;
  clear: () => void;
};
export const LogCalculatedFromFieldContext = createContext<ContextValue | undefined>(undefined);

export function useLogCalculatedFromField() {
  return useContext(LogCalculatedFromFieldContext);
}
