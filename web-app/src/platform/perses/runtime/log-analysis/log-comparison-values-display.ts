/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { LogComparisonGroup } from '../../logs/log-comparison-result';
import { logAnalysisGroupLabel } from './log-grouping-display';
export function comparisonGroupLabel(group: LogComparisonGroup, t: TFunction) {
  return logAnalysisGroupLabel(
    group.keys.length ? { keys: group.keys, kind: null, value: null } : { kind: 'all', value: null },
    t
  );
}
