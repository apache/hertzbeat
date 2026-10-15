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

import { DownOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, InputNumber, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { PublicStatusIncident, PublicStatusState } from '../model/public-status-contract';
import {
  earliestPublicStatusIncidentYear,
  type PublicStatusIncidentRange
} from '../model/public-status-incident-range';
import { publicIncidentStateKey } from '../model/public-status-model';
import styles from './public-status.module.css';
import { PublicStatusRegionState } from './public-status-region-state';

type IncidentProps = {
  incidents: PublicStatusIncident[];
  range: PublicStatusIncidentRange;
  refreshing: boolean;
  state: PublicStatusState;
  onYearChange: (year: number) => void;
  onRefresh: () => unknown;
};

export function PublicStatusIncidents({ incidents, range, refreshing, state, onYearChange, onRefresh }: IncidentProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <div className={styles.incidentHeader}>
        <div>
          <Typography.Title level={3}>{t('status.incidentHistory')}</Typography.Title>
          <Typography.Text type="secondary">{t('status.incidentHistoryDescription')}</Typography.Text>
        </div>
        <IncidentYearToolbar
          year={range.year}
          refreshing={refreshing}
          onYearChange={onYearChange}
          onRefresh={onRefresh}
        />
      </div>
      {state === 'ready' ? (
        <div className={styles.incidentList}>
          {incidents.map(incident => (
            <StatusIncident incident={incident} key={incident.id} />
          ))}
        </div>
      ) : state === 'empty' ? (
        <OperationalStatePanel kind="empty" presentation="quiet" title={t('status.noIncidents')} />
      ) : (
        <PublicStatusRegionState state={state} loadingKey="status.loadingIncidents" />
      )}
    </section>
  );
}

function IncidentYearToolbar({
  year,
  refreshing,
  onYearChange,
  onRefresh
}: {
  year: number;
  refreshing: boolean;
  onYearChange: (year: number) => void;
  onRefresh: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.incidentToolbar}>
      <InputNumber
        aria-label={t('status.incidentYear')}
        precision={0}
        min={earliestPublicStatusIncidentYear}
        max={new Date().getFullYear()}
        value={year}
        onChange={value => {
          if (typeof value === 'number') onYearChange(value);
        }}
      />
      <Button
        aria-label={t('common.refresh')}
        icon={<ReloadOutlined />}
        loading={refreshing}
        onClick={() => void onRefresh()}
      />
    </div>
  );
}

function StatusIncident({ incident }: { incident: PublicStatusIncident }) {
  const { i18n, t } = useTranslation();
  const locale = i18n?.language ?? 'en-US';
  return (
    <details className={styles.incident} data-incident-state={incident.state}>
      <summary>
        <span className={styles.incidentMarker} aria-hidden />
        <span className={styles.incidentCopy}>
          <Typography.Text strong>{incident.name}</Typography.Text>
          <Typography.Text type="secondary">
            {incident.startTime ? new Date(incident.startTime).toLocaleString(locale) : t('status.timeUnavailable')}
          </Typography.Text>
        </span>
        <Tag bordered={false}>{t(publicIncidentStateKey(incident.state))}</Tag>
        <DownOutlined className={styles.disclosureIcon} aria-hidden />
      </summary>
      <IncidentEvidence incident={incident} />
    </details>
  );
}

function IncidentEvidence({ incident }: { incident: PublicStatusIncident }) {
  const { i18n, t } = useTranslation();
  const locale = i18n?.language ?? 'en-US';
  if (incident.components === null || incident.contents === null) {
    return <OperationalStatePanel kind="unavailable" title={t('status.incidentDetailsUnavailable')} />;
  }
  return (
    <div className={styles.incidentEvidence}>
      <div className={styles.affectedComponents}>
        <Typography.Text strong>{t('status.affectedComponents')}</Typography.Text>
        <div>
          {incident.components.length
            ? incident.components.map(component => <Tag key={component.id}>{component.name}</Tag>)
            : t('status.noAffectedComponents')}
        </div>
      </div>
      {incident.contents.length ? (
        <ol className={styles.incidentTimeline}>
          {incident.contents.map(content => (
            <li key={content.id} data-update-state={content.state}>
              <div className={styles.timelineMeta}>
                <Typography.Text>{t(publicIncidentStateKey(content.state))}</Typography.Text>
                <Typography.Text type="secondary">{new Date(content.timestamp).toLocaleString(locale)}</Typography.Text>
              </div>
              <Typography.Paragraph>{content.message}</Typography.Paragraph>
            </li>
          ))}
        </ol>
      ) : (
        <OperationalStatePanel kind="empty" presentation="quiet" title={t('status.noIncidentUpdates')} />
      )}
    </div>
  );
}
