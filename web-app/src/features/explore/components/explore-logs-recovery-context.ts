/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { createContext } from 'react';

import type { LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';

export const ExploreLogsRecoveryContext = createContext<{
  reviewSourceB: (diagnostic: LogSyntaxDiagnostic | undefined) => void;
} | null>(null);
