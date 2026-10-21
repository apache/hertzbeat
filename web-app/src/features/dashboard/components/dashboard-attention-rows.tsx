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

import { InfoCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buildMonitorDetailPath } from '@/shared/navigation/app-paths';
import { dashboardAlertTarget, dashboardAlertObjectName, type DashboardOverview } from '../model/dashboard-overview';
import { dashboardAlertSeverity, dashboardEventAge } from '../model/dashboard-attention';
import styles from './dashboard-overview.module.css';

type Group = DashboardOverview['alerts'][number];
export function DashboardAlertRows({ alerts }: { alerts: Group[] }) {
  return (
    <>
      {alerts.map(group => (
        <AlertEvent key={group.id} group={group} />
      ))}
    </>
  );
}
function AlertEvent({ group }: { group: Group }) {
  const { t } = useTranslation();
  const severity = dashboardAlertSeverity(group);
  const level = severity === 'unknown' ? '' : t(`alert.severity.${severity}`);
  const status = t(`alert.status.${group.status || 'firing'}`);
  const summary =
    group.commonAnnotations?.summary ||
    group.commonLabels?.alertname ||
    group.groupLabels?.alertname ||
    t('dashboard.v2.alertGroup', { id: group.id });
  const Icon = {
    info: InfoCircleOutlined,
    unknown: InfoCircleOutlined,
    warning: WarningOutlined,
    critical: CloseCircleOutlined,
    emergency: CloseCircleOutlined
  }[severity];
  return (
    <EventRow
      target={dashboardAlertTarget(group)}
      name={dashboardAlertObjectName(group)}
      summary={summary}
      meta={[status, level].filter(Boolean).join(' · ')}
      updated={group.gmtUpdate}
      severity={severity}
      icon={<Icon aria-label={level || status} />}
    />
  );
}
export function DashboardDownRows({ monitors }: { monitors: DashboardOverview['downMonitors'] }) {
  const { t } = useTranslation();
  return (
    <>
      {monitors.map(monitor => (
        <EventRow
          key={monitor.id}
          target={buildMonitorDetailPath(monitor.id)}
          name={monitor.name}
          summary={monitor.description || '—'}
          meta={`${t('monitor.status.unavailable')} · ${monitor.app}`}
          updated={monitor.gmtUpdate}
          severity="unavailable"
          icon={<CloseCircleOutlined aria-label={t('monitor.status.unavailable')} />}
        />
      ))}
    </>
  );
}
type RowProps = {
  target: string;
  name: string;
  summary: string;
  meta: string;
  severity: string;
  updated: string | number | null | undefined;
  icon: ReactNode;
};
function EventRow({ target, name, summary, meta, severity, updated, icon }: RowProps) {
  const { t } = useTranslation();
  return (
    <Link to={target} className={styles.attentionRow} data-severity={severity}>
      <span className={styles.eventIcon}>{icon}</span>
      <span className={styles.eventCopy}>
        <span className={styles.eventTitle}>
          <strong title={name}>{name}</strong>
          <small>{meta}</small>
        </span>
        <span className={styles.issueText} title={summary}>
          {summary}
        </span>
      </span>
      <span className={styles.eventAside}>
        <EventTime value={updated} />
        <span className={styles.eventAction}>{t('common.view')}</span>
      </span>
    </Link>
  );
}
function EventTime({ value }: { value: RowProps['updated'] }) {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const age = dashboardEventAge(value, now);
  if (!age) return <span>—</span>;
  return (
    <time
      dateTime={new Date(age.timestamp).toISOString()}
      title={new Date(age.timestamp).toLocaleString(i18n.language)}
    >
      {new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' }).format(age.value, age.unit)}
    </time>
  );
}
