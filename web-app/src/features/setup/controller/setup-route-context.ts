/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { createContext, useContext } from 'react';

import type { SetupRouteController } from './use-setup-route-controller';

export type ReadySetupController = Extract<SetupRouteController, { state: 'ready' }>;
export const SetupRouteContext = createContext<ReadySetupController | null>(null);

export function useSetupRouteContext() {
  const value = useContext(SetupRouteContext);
  if (!value) throw new Error('Setup route context is unavailable.');
  return value;
}
