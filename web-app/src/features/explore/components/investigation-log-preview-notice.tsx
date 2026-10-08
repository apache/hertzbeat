/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

import type { InvestigationLogRecord } from '../model/explore-investigation-contract';

export function InvestigationLogPreviewNotice({ rows }: { rows: readonly InvestigationLogRecord[] }) {
  const { t } = useTranslation();
  const affected = new Set<string>();
  const fields = new Set<string>();
  for (const row of rows) {
    for (const scope of ['attributes', 'resourceAttributes'] as const) {
      for (const key of row.truncatedFields?.[scope] ?? []) {
        affected.add(row.logRecordUid);
        fields.add(`${scope}.${key}`);
      }
    }
  }
  if (affected.size === 0) return null;
  return (
    <p role="note" data-investigation-log-preview-notice>
      {t('exploreInvestigation.logPreview.truncated', {
        count: affected.size,
        fields: [...fields].sort().join(', ')
      })}
    </p>
  );
}
