/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useState, type ReactNode } from 'react';

import { ShellInvestigationContext, type ShellInvestigationTarget } from './shell-investigation-context';

export function ShellInvestigationProvider({ children }: { children: ReactNode }) {
  const [target, publish] = useState<ShellInvestigationTarget>();
  return (
    <ShellInvestigationContext.Provider value={{ target, publish }}>{children}</ShellInvestigationContext.Provider>
  );
}
