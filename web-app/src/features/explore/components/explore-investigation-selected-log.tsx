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

import { logSeverityLabel } from '@/shared/log-severity';
import { Descriptions, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import type { InvestigationLogRecord } from '../model/explore-investigation-contract';
import { investigationUnixNanoToEpochMillis } from '../model/explore-investigation-model';
import styles from './explore-investigation-log.module.css';
import { OtlpAttributeSection } from './otlp-attribute-list';

export function InvestigationSelectedLog({ row, timeZone }: { row: InvestigationLogRecord; timeZone: string }) {
  const { t } = useTranslation();
  return (
    <aside className={styles.selectedLog} aria-label={t('exploreInvestigation.sections.selectedLog')}>
      <header>
        <h3>{t('exploreInvestigation.sections.selectedLog')}</h3>
        <Tag color="blue">{t('exploreInvestigation.logs.anchor')}</Tag>
      </header>
      <p className={styles.logBody}>{row.body ?? '—'}</p>
      <Descriptions
        size="small"
        column={1}
        items={[
          { key: 'time', label: t('explore.time'), children: formatInvestigationLogTime(row.timeUnixNano, timeZone) },
          { key: 'severity', label: t('explore.severity'), children: logSeverityLabel(row) ?? '—' },
          { key: 'trace', label: t('explore.traceId'), children: row.traceId ?? '—' },
          { key: 'span', label: t('explore.spanId'), children: row.spanId ?? '—' }
        ]}
      />
      <OtlpAttributeSection title={t('exploreLog.resourceAttributes')} value={row.resourceAttributes} />
      <OtlpAttributeSection title={t('exploreLog.logAttributes')} value={row.attributes} />
    </aside>
  );
}

function formatInvestigationLogTime(timeUnixNano: string, timeZone: string) {
  const epochMillis = investigationUnixNanoToEpochMillis(timeUnixNano);
  if (epochMillis == null) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone
  }).format(epochMillis);
}
