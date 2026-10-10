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
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { DashboardActivityModel, DashboardCountEvidence } from '../model/dashboard-activity';
import styles from './dashboard-activity.module.css';

export function DashboardActivity({ activity }: { activity: DashboardActivityModel }) {
  const { t } = useTranslation();
  return (
    <section className={styles.activity} aria-label={t('dashboard.daily.title')}>
      <div className={styles.toolbar}>
        <Typography.Text type="secondary">{t('dashboard.daily.scope')}</Typography.Text>
        <Button disabled={activity.refreshing} onClick={() => void activity.refresh()}>
          {t('common.refresh')}
        </Button>
      </div>
      <ActivityEntry kind="monitors" evidence={activity.monitors} target={activity.targets.monitors} />
      <ActivityEntry kind="alerts" evidence={activity.alerts} target={activity.targets.alerts} />
      <ActivityEntry kind="services" evidence={activity.services} target={activity.targets.services} />
      <div className={styles.signals}>
        <Typography.Text type="secondary">{t('dashboard.daily.signalsDescription')}</Typography.Text>
        <Link to={activity.targets.signals}>{t('dashboard.daily.openSignals')}</Link>
      </div>
    </section>
  );
}

function ActivityEntry({
  kind,
  evidence,
  target
}: {
  kind: 'monitors' | 'alerts' | 'services';
  evidence: DashboardCountEvidence;
  target: string;
}) {
  const { t } = useTranslation();
  return (
    <section
      className={styles.entry}
      data-testid={`dashboard-activity-${kind}`}
      aria-busy={evidence.kind === 'loading'}
    >
      <div>
        <Typography.Title level={3}>{t(`dashboard.daily.${kind}.title`)}</Typography.Title>
        <Typography.Text type="secondary">{t(`dashboard.daily.${kind}.description`)}</Typography.Text>
      </div>
      <Typography.Text className={styles.evidence!} role={evidence.kind === 'ready' ? undefined : 'status'}>
        {evidence.kind === 'ready'
          ? t(`dashboard.daily.${kind}.${evidence.count === 0 ? 'empty' : 'count'}`, { count: evidence.count })
          : t(`dashboard.daily.states.${evidence.kind}`)}
      </Typography.Text>
      <Link to={target}>{t(`dashboard.daily.${kind}.open`)}</Link>
    </section>
  );
}
