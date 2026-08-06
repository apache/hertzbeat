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

import { Button, Select, Space, Tag, Typography } from 'antd';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { supportedLocales, type SupportedLocale } from '@/core/i18n/locale';
import { defaultStatusAccent } from '@/features/status/shared/status-constants';

import type { PublicStatusOrg, PublicStatusOrgState, PublicStatusViewModel } from '../model/public-status-contract';
import { publicOrgStateKey } from '../model/public-status-model';
import { PublicStatusComponents } from './public-status-components';
import { PublicStatusIncidents } from './public-status-incidents';
import styles from './public-status.module.css';

export function PublicStatusView(props: PublicStatusViewModel) {
  return (
    <main
      className={styles.page}
      style={{ '--status-accent': props.org?.color ?? defaultStatusAccent } as CSSProperties}
    >
      <StatusHeader locale={props.locale} org={props.org} onLocaleChange={props.selectLocale} />
      <StatusBody
        incidentRange={props.incidentRange}
        componentState={props.componentState}
        incidentState={props.incidentState}
        refreshing={props.refreshing}
        components={props.components}
        incidents={props.incidents}
        onIncidentYearChange={props.selectIncidentYear}
        onRefresh={props.refresh}
      />
    </main>
  );
}

function StatusHeader({
  locale,
  org,
  onLocaleChange
}: {
  locale: SupportedLocale;
  org: PublicStatusOrg | undefined;
  onLocaleChange: (locale: SupportedLocale) => unknown;
}) {
  const { t } = useTranslation();
  return (
    <header className={styles.header}>
      <Space align="start">
        <StatusBrand org={org} />
        <div>
          <Typography.Title level={2}>{org?.name ?? t('status.title')}</Typography.Title>
          <Typography.Text type="secondary">{org?.description ?? t('status.description')}</Typography.Text>
        </div>
      </Space>
      <Space>
        <Select<SupportedLocale>
          aria-label={t('shell.actions.language')}
          className={styles.languageSelect ?? ''}
          options={supportedLocales.map(value => ({
            value,
            label: t(`systemConfig.locale.${value.replace('-', '_')}`)
          }))}
          size="small"
          value={locale}
          onChange={value => void onLocaleChange(value)}
        />
        {org?.feedback && (
          <Button href={publicStatusFeedbackHref(org.feedback)} target="_blank" rel="noreferrer">
            {t('status.feedback')}
          </Button>
        )}
        {org && <Tag color={orgStateColor(org.state)}>{t(publicOrgStateKey(org.state))}</Tag>}
      </Space>
    </header>
  );
}

function StatusBrand({ org }: { org: PublicStatusOrg | undefined }) {
  if (!org?.logo) return null;
  const logo = <img className={styles.logo} src={org.logo} alt={org.name} />;
  if (!org.home) return logo;
  return (
    <a href={org.home} target="_blank" rel="noreferrer">
      {logo}
    </a>
  );
}

type StatusBodyProps = Pick<
  PublicStatusViewModel,
  'componentState' | 'components' | 'incidentRange' | 'incidents' | 'incidentState' | 'refreshing'
> & {
  onIncidentYearChange: PublicStatusViewModel['selectIncidentYear'];
  onRefresh: PublicStatusViewModel['refresh'];
};

function StatusBody(props: StatusBodyProps) {
  return (
    <>
      <PublicStatusComponents components={props.components} state={props.componentState} />
      <PublicStatusIncidents
        incidents={props.incidents}
        range={props.incidentRange}
        refreshing={props.refreshing}
        state={props.incidentState}
        onYearChange={props.onIncidentYearChange}
        onRefresh={props.onRefresh}
      />
    </>
  );
}

function orgStateColor(state: PublicStatusOrgState) {
  if (state === 'healthy') return 'green';
  if (state === 'degraded') return 'orange';
  if (state === 'incident') return 'red';
  return 'default';
}

function publicStatusFeedbackHref(feedback: string) {
  const normalized = feedback.toLowerCase();
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return feedback;
  return `mailto:${feedback}`;
}
