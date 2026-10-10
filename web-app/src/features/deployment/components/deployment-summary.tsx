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

import { Button, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DeploymentView } from '../model/deployment-contract';
import styles from './deployment-summary.module.css';

export function DeploymentSummary({ deployment }: { deployment: DeploymentView }) {
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const managementDatabase = databaseKindLabel(deployment.managementDatabase.kind) ?? t('deployment.topology.unknown');
  const telemetryDatabase = databaseKindLabel(deployment.greptimeDatabase.kind) ?? t('deployment.topology.unknown');
  return (
    <section className={styles.summary} aria-label={t('deployment.current.title')}>
      <div className={styles.overview}>
        <div className={styles.overviewCopy}>
          <Typography.Text className={styles.summarySentence!}>
            {t('deployment.current.summary', {
              managementDatabase,
              telemetryDatabase,
              applyMode: t(`deployment.applyModeInline.${deployment.applyMode}`),
              topology: t(`deployment.topologyInline.${deployment.topology}`)
            })}
          </Typography.Text>
          <ul className={styles.scope} aria-label={t('deployment.current.scope')}>
            <li>{t('deployment.current.databaseConnections')}</li>
            <li>{t('deployment.current.configurationManagement')}</li>
            <li>{t('deployment.current.maintenanceMode')}</li>
          </ul>
        </div>
        <Button
          type="link"
          size="small"
          className={styles.detailsToggle!}
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen(open => !open)}
        >
          {t(detailsOpen ? 'deployment.current.hideDetails' : 'deployment.current.viewDetails')}
        </Button>
      </div>

      {detailsOpen ? (
        <div className={styles.evidence}>
          <div className={styles.databases}>
            <DatabaseRow
              database={deployment.managementDatabase}
              description={t('deployment.current.managementDatabaseDescription')}
              label={t('deployment.current.managementDatabase')}
            />
            <DatabaseRow
              database={deployment.greptimeDatabase}
              description={t('deployment.current.greptimeDatabaseDescription')}
              label={t('deployment.current.greptimeDatabase')}
            />
          </div>

          <dl className={styles.metadata}>
            <MetadataItem
              label={t('deployment.current.applyMode')}
              value={t(`deployment.applyMode.${deployment.applyMode}`)}
            />
            <MetadataItem
              label={t('deployment.current.maintenanceMode')}
              value={t(`deployment.maintenance.${deployment.maintenanceMode}`)}
            />
            <MetadataItem
              label={t('deployment.current.topology')}
              value={t(`deployment.topology.${deployment.topology}`)}
            />
          </dl>
        </div>
      ) : null}
    </section>
  );
}

function DatabaseRow({
  database,
  description,
  label
}: {
  database: DeploymentView['managementDatabase'] | DeploymentView['greptimeDatabase'];
  description: string;
  label: string;
}) {
  const { t } = useTranslation();
  const kind = databaseKindLabel(database.kind) ?? t('deployment.topology.unknown');
  return (
    <div className={styles.databaseRow} role="group" aria-label={label}>
      <div className={styles.databaseCopy}>
        <Typography.Text strong>{label}</Typography.Text>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
      <div className={styles.databaseTruth}>
        <Typography.Text strong className={styles.databaseKind!}>
          {kind}
        </Typography.Text>
        <Typography.Text type="secondary">{t(`deployment.source.${database.source}`)}</Typography.Text>
        {database.restartRequired ? (
          <Typography.Text className={styles.restartRequired!}>
            {t('deployment.current.restartRequired')}
          </Typography.Text>
        ) : null}
      </div>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metadataItem}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function databaseKindLabel(kind: DeploymentView['managementDatabase']['kind'] | 'greptime') {
  if (kind === 'greptime') return 'GreptimeDB';
  if (kind === 'mysql') return 'MySQL';
  if (kind === 'postgresql') return 'PostgreSQL';
  if (kind === 'h2') return 'H2';
  return null;
}
