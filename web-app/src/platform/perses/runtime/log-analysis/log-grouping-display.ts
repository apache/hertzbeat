/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { LogGroupKey } from '../../logs/log-grouping';
export function logAnalysisGroupLabel(
  group: { keys?: LogGroupKey[] | undefined; kind: string | null; value: string | null },
  t: TFunction
): string {
  return group.keys
    ? group.keys
        .map(key => (key.kind === 'value' ? JSON.stringify(key.value) : `[${groupValueLabel(key, t)}]`))
        .join(' / ')
    : groupValueLabel(group, t);
}
export function groupValueLabel(group: { kind: string | null; value: string | null }, t: TFunction) {
  return group.kind === 'value'
    ? group.value === ''
      ? t('explore.logAnalysis.empty')
      : group.value!
    : t(
        `explore.logAnalysis.${group.kind === 'all' ? 'everything' : group.kind === 'non_scalar' ? 'nonScalar' : group.kind}`
      );
}

export function logGroupingFieldLabel(field: string, t: TFunction) {
  return field.startsWith('builtin:') ? t(`explore.logFacets.builtin.${field.slice(8)}`) : field;
}
