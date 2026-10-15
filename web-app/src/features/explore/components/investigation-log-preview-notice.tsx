/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
