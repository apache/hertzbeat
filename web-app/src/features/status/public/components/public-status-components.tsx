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

import { CheckCircleFilled, DownOutlined, ExclamationCircleFilled, QuestionCircleFilled } from '@ant-design/icons';
import { Typography } from 'antd';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type {
  PublicStatusComponent,
  PublicStatusComponentState,
  PublicStatusHistory,
  PublicStatusState
} from '../model/public-status-contract';
import {
  publicStatusAvailability,
  publicStatusHistoryBounds,
  publicStatusHistoryStateCounts,
  publicStatusHistoryTimeline,
  publicStatusHistoryTimelineBounds,
  recentPublicStatusHistory
} from '../model/public-status-history';
import { publicComponentStateKey } from '../model/public-status-model';
import styles from './public-status.module.css';
import { PublicStatusRegionState } from './public-status-region-state';

const publishedHistoryPointCount = 90;

export function PublicStatusComponents({
  components,
  state
}: {
  components: PublicStatusComponent[];
  state: PublicStatusState;
}) {
  const { i18n, t } = useTranslation();
  const locale = i18n?.language ?? 'en-US';
  const historyWindowEnd = publicStatusHistoryBounds(components)?.latest;
  let content;
  if (state === 'ready') {
    content = (
      <div className={styles.componentList}>
        {components.map(component => (
          <StatusComponent key={component.id} component={component} historyWindowEnd={historyWindowEnd} />
        ))}
      </div>
    );
  } else if (state === 'empty') {
    content = <OperationalStatePanel kind="empty" presentation="quiet" title={t('status.noComponents')} />;
  } else {
    content = <PublicStatusRegionState state={state} loadingKey="status.loading" />;
  }

  return (
    <section className={`${styles.section} ${styles.statusSurface}`}>
      <div className={styles.surfaceHeader}>
        <Typography.Title level={3}>{t('status.systemStatus')}</Typography.Title>
        <Typography.Text type="secondary">{componentHistoryRange(components, locale, t)}</Typography.Text>
      </div>
      {content}
    </section>
  );
}

function StatusComponent({
  component,
  historyWindowEnd
}: {
  component: PublicStatusComponent;
  historyWindowEnd: number | undefined;
}) {
  const { i18n, t } = useTranslation();
  const locale = i18n?.language ?? 'en-US';
  const history = recentPublicStatusHistory(component.history, publishedHistoryPointCount);
  const timeline = publicStatusHistoryTimeline(component.history, publishedHistoryPointCount, historyWindowEnd);
  const availability = publicStatusAvailability(component.history);
  return (
    <article className={styles.component} data-component-state={component.state}>
      <div className={styles.componentSummary}>
        <div className={styles.componentIdentity}>
          <ComponentStateIcon state={component.state} />
          <div>
            <Typography.Text strong>{component.name}</Typography.Text>
            {component.description && <Typography.Text type="secondary">{component.description}</Typography.Text>}
          </div>
        </div>
        <div className={styles.componentAvailability}>
          <Typography.Text>{t(publicComponentStateKey(component.state))}</Typography.Text>
          <Typography.Text type="secondary">
            {availability === undefined ? t('status.availabilityUnavailable') : formatAvailability(availability)}
          </Typography.Text>
        </div>
      </div>
      <HistoryStrip history={timeline} locale={locale} />
      <HistoryEvidence history={history.newestFirst} locale={locale} />
    </article>
  );
}

function ComponentStateIcon({ state }: { state: PublicStatusComponentState }) {
  const className = styles.componentStateIcon;
  if (state === 'healthy') return <CheckCircleFilled className={className} aria-hidden />;
  if (state === 'incident') return <ExclamationCircleFilled className={className} aria-hidden />;
  return <QuestionCircleFilled className={className} aria-hidden />;
}

function HistoryStrip({ history, locale }: { history: PublicStatusHistory[] | null; locale: string }) {
  const { t } = useTranslation();
  if (history === null) return <Typography.Text type="secondary">{t('status.historyUnavailable')}</Typography.Text>;
  if (!history.length) return <Typography.Text type="secondary">{t('status.noHistory')}</Typography.Text>;
  const stateCounts = publicStatusHistoryStateCounts(history);
  return (
    <div
      className={styles.historyStrip}
      data-history-points={history.length}
      data-status-history
      role="img"
      style={{ '--history-point-count': history.length } as CSSProperties}
      aria-label={t('status.historySummary', { count: history.length, ...stateCounts })}
    >
      {history.map((entry, index) => (
        <span
          aria-hidden
          className={styles.historyPoint}
          data-state={entry.state}
          key={entry.id ?? `${entry.timestamp}-${index}`}
          title={`${new Date(entry.timestamp).toLocaleDateString(locale)} · ${t(publicComponentStateKey(entry.state))}`}
        />
      ))}
    </div>
  );
}

function HistoryEvidence({ history, locale }: { history: PublicStatusHistory[] | null; locale: string }) {
  const { t } = useTranslation();
  if (history === null || !history.length) return null;
  return (
    <details className={styles.disclosure}>
      <summary>
        <span>{t('status.viewHistoryEvidence')}</span>
        <DownOutlined aria-hidden />
      </summary>
      <div className={styles.historyTableWrap}>
        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>{t('status.historyTime')}</th>
              <th>{t('status.state')}</th>
              <th>{t('status.uptime')}</th>
              <th>{t('status.normalSeconds')}</th>
              <th>{t('status.abnormalSeconds')}</th>
              <th>{t('status.unknownSeconds')}</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, index) => (
              <tr key={entry.id ?? `${entry.timestamp}-${index}`}>
                <td>{new Date(entry.timestamp).toLocaleString(locale)}</td>
                <td>{t(publicComponentStateKey(entry.state))}</td>
                <td>{entry.uptime === undefined ? '—' : formatAvailability(entry.uptime)}</td>
                <td>{evidence(entry.normal)}</td>
                <td>{evidence(entry.abnormal)}</td>
                <td>{evidence(entry.unknowing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function componentHistoryRange(components: PublicStatusComponent[], locale: string, t: (key: string) => string) {
  const bounds = publicStatusHistoryTimelineBounds(components, publishedHistoryPointCount);
  if (!bounds) return t('status.periodUnavailable');
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${formatter.format(bounds.earliest)} – ${formatter.format(bounds.latest)}`;
}

function formatAvailability(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function evidence(value: number | undefined) {
  return value === undefined ? '—' : value;
}
