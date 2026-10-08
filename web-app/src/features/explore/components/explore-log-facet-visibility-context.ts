/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { createContext } from 'react';
import type { LogFacetWorkspace } from '../model/explore-log-facet-workspace';

export const LogFacetVisibilityContext = createContext<LogFacetWorkspace | null>(null);
