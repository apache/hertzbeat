/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogComparisonResult } from '@/platform/perses';
export type LogComparisonLoad = {
  state:
    'idle' | 'loading' | 'ready' | 'error' | 'permission' | 'unavailable' | 'invalid_filter' | 'interval_too_small';
  invalidFilter?:
    | {
        reason?: import('./explore-log-filter-failure').LogFilterFailureReason | undefined;
        source?: 'a' | 'b' | undefined;
        diagnostic?: import('./explore-log-filter-failure').LogSyntaxDiagnostic | undefined;
      }
    | undefined;
  data: LogComparisonResult | undefined;
  retry: () => void;
};
