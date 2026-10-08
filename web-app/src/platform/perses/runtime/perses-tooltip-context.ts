/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { createContext, type ReactNode } from 'react';

// Runtime-only host content; never part of a persisted Perses document.
export const PersesTooltipTimestampContext = createContext<((timestamp: number) => ReactNode) | undefined>(undefined);
