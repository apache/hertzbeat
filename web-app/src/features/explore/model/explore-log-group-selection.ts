/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { readLogGroupSelection } from '@/shared/log-group-selection';
export function logGroupSelectionLabel(raw: string, t: TFunction): string {
  const selection = readLogGroupSelection(raw);
  if (!selection) return t('explore.logGroupSelection.invalid');
  const value = selection.groups
    .map(
      group =>
        `${group.field}: ${group.kind === 'value' ? JSON.stringify(group.value) : t(`explore.logAnalysis.${group.kind === 'non_scalar' ? 'nonScalar' : group.kind}`)}`
    )
    .join(' AND ');
  return t('explore.logGroupSelection.label', { value });
}
