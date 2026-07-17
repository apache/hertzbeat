/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { createContext, useContext } from 'react';

import type { RuntimeTheme } from './runtime-preferences';

type RuntimeThemeState = {
  theme: RuntimeTheme;
  setTheme: (theme: RuntimeTheme) => void;
};

export const RuntimeThemeContext = createContext<RuntimeThemeState | null>(null);

export function useRuntimeTheme() {
  const value = useContext(RuntimeThemeContext);
  if (!value) throw new Error('Runtime theme context is unavailable.');
  return value;
}
