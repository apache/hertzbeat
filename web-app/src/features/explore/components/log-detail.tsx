/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Descriptions, Drawer, Typography } from 'antd';
import type { TFunction } from 'i18next';

import type { LogRow } from '../model/explore-signal-contract';
import { buildCrossSignalPath, type LogExploreQuery } from '../model/explore-model';
import { logBody } from '../model/explore-signal-model';
import { formatLogTime } from './log-display';
import styles from './log-result.module.css';
import { OtlpAttributeSection } from './otlp-attribute-list';

export function LogDetail({
  row,
  t,
  query,
  navigate,
  onClose,
}: {
  row?: LogRow | undefined;
  t: TFunction;
  query: LogExploreQuery;
  navigate: (path: string) => void;
  onClose: () => void;
}) {
  return (
    <Drawer
      size="large"
      open={Boolean(row)}
      title={t('exploreLog.detail')}
      onClose={onClose}
      extra={row?.traceId ? (
        <Button
          onClick={() => {
            void navigate(buildCrossSignalPath(query, 'traces', { traceId: row.traceId ?? undefined }));
          }}
        >
          {t('exploreLog.openTrace')}
        </Button>
      ) : undefined}
    >
      {row && (
        <>
          <Typography.Paragraph className={styles.body ?? ''}>{logBody(row) ?? '—'}</Typography.Paragraph>
          <Descriptions
            column={1}
            size="small"
            bordered
            items={[
              { key: 'time', label: t('explore.time'), children: formatLogTime(row) },
              { key: 'severity', label: t('explore.severity'), children: row.severityText ?? '—' },
              { key: 'trace', label: t('explore.traceId'), children: row.traceId ?? '—' },
              { key: 'span', label: t('explore.spanId'), children: row.spanId ?? '—' },
            ]}
          />
          <OtlpAttributeSection title={t('exploreLog.resourceAttributes')} value={row.resource ?? undefined} />
          <OtlpAttributeSection title={t('exploreLog.logAttributes')} value={row.attributes ?? undefined} />
        </>
      )}
    </Drawer>
  );
}
