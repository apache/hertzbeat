/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Collapse, Descriptions, Space, Tag, Typography } from 'antd';
import type { CollapseProps } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../shared/alert-center.module.css';
import type { AlertRecord } from '../model/alert-model';

type AlertCenterGroupDetailsProps = {
  alerts: AlertRecord[];
};

export function AlertCenterGroupDetails({ alerts }: AlertCenterGroupDetailsProps) {
  const { t } = useTranslation();
  return <Collapse ghost size="small" items={alerts.map(alert => buildAlertItem(alert, t))} />;
}

function buildAlertItem(alert: AlertRecord, t: (key: string) => string): NonNullable<CollapseProps['items']>[number] {
  return {
    key: alert.id,
    label: (
      <div className={styles.alertRecordHeader}>
        <Typography.Text strong>{alert.labels?.alertname ?? `#${alert.id}`}</Typography.Text>
        <Typography.Text type="secondary">{alert.content ?? '—'}</Typography.Text>
      </div>
    ),
    extra: <Tag color={alert.status === 'firing' ? 'error' : 'success'}>{t(`alert.status.${alert.status}`)}</Tag>,
    children: <AlertRecordEvidence alert={alert} t={t} />
  };
}

function AlertRecordEvidence({ alert, t }: { alert: AlertRecord; t: (key: string) => string }) {
  return (
    <div className={styles.alertRecordEvidence}>
      <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
        <Descriptions.Item label={t('alert.details.triggerTimes')}>{alert.triggerTimes ?? '—'}</Descriptions.Item>
        <Descriptions.Item label={t('alert.details.startAt')}>{formatTimestamp(alert.startAt)}</Descriptions.Item>
        <Descriptions.Item label={t('alert.details.activeAt')}>{formatTimestamp(alert.activeAt)}</Descriptions.Item>
        <Descriptions.Item label={t('alert.details.endAt')}>{formatTimestamp(alert.endAt)}</Descriptions.Item>
      </Descriptions>
      <EvidenceMap title={t('alert.details.labels')} values={alert.labels} tags />
      <EvidenceMap title={t('alert.details.annotations')} values={alert.annotations} />
    </div>
  );
}

function EvidenceMap({
  title,
  values,
  tags = false
}: {
  title: string;
  values: Record<string, string> | null;
  tags?: boolean;
}) {
  if (!values || Object.keys(values).length === 0) return null;
  return (
    <div className={styles.alertRecordMap}>
      <Typography.Text type="secondary">{title}</Typography.Text>
      <Space size={[4, 4]} wrap>
        {Object.entries(values).map(([key, value]) =>
          tags ? (
            <Tag key={key}>
              {key}={value}
            </Tag>
          ) : (
            <span key={key}>
              <Typography.Text strong>{key}: </Typography.Text>
              <Typography.Text>{value}</Typography.Text>
            </span>
          )
        )}
      </Space>
    </div>
  );
}

function formatTimestamp(value: number | null) {
  return value == null
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value);
}
