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

import { Button, Segmented, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';
import type { ServicesViewProps } from '../model/services-model';
import { ServiceOverview } from './service-overview';
import { ServicePerformanceDirectory } from './service-performance-directory';
import { ServiceDirectory } from './service-directory';
import { ServiceQueryControls } from './service-query-controls';
import { ServiceContextRail } from './service-context-rail';
import styles from './services-view.module.css';

export function ServicesView({ state, actions }: ServicesViewProps) {
  const { t } = useTranslation();
  const selected = Boolean(state.query.entityId);
  const identity = state.identity ?? (state.red.kind === 'ready' ? state.red.data.identity : undefined);
  const heading = selected
    ? serviceHeading(state, identity, t)
    : { title: t('services.title'), description: t('services.description') };
  return (
    <div className={styles.pageInset}>
      <OperationalPage mode="workspace" inset="compact">
        {selected && (
          <div className={styles.backDirectory}>
            <Button type="link" onClick={actions.directory}>
              {t('services.backDirectory')}
            </Button>
          </div>
        )}
        <OperationalPageHeader
          title={heading.title}
          description={heading.description}
          actions={
            <div className={styles.headerControls}>
              {selected && <ServiceQueryControls state={state} actions={actions} />}
              <Button onClick={actions.refresh}>{t('common.refresh')}</Button>
            </div>
          }
        />
        {!selected && <ServiceViewSwitch state={state} actions={actions} />}
        {!selected && <ServiceQueryControls state={state} actions={actions} />}
        <ServiceSignalActions state={state} actions={actions} />
        {selected ? (
          <div className={styles.workspace}>
            <ServiceContextRail state={state} actions={actions} />
            <section className={styles.overview} aria-label={t('services.overview')}>
              <ServiceOverview state={state} actions={actions} />
            </section>
          </div>
        ) : (
          <section className={styles.directory} aria-label={t('services.directory')}>
            {state.query.view === 'registered' ? (
              <ServiceDirectory state={state} actions={actions} />
            ) : (
              <ServicePerformanceDirectory state={state} actions={actions} />
            )}
          </section>
        )}
      </OperationalPage>
    </div>
  );
}

function ServiceSignalActions({ state, actions }: ServicesViewProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.signalActions}>
      <Space wrap>
        <Button disabled={!state.validWindow || !state.paths.traces} onClick={() => actions.open(state.paths.traces)}>
          {t('services.openTraces')}
        </Button>
        <Button disabled={!state.validWindow || !state.paths.logs} onClick={() => actions.open(state.paths.logs)}>
          {t('services.openLogs')}
        </Button>
        <Button disabled={!state.validWindow || !state.paths.metrics} onClick={() => actions.open(state.paths.metrics)}>
          {t('services.openMetrics')}
        </Button>
      </Space>
      <span>{t(state.query.entityId ? 'services.logsScope' : 'services.unresolved')}</span>
    </div>
  );
}

function serviceHeading(
  state: ServicesViewProps['state'],
  identity: ServicesViewProps['state']['identity'],
  t: ReturnType<typeof useTranslation>['t']
) {
  const entity = state.detail.kind === 'ready' ? state.detail.data.entity : undefined;
  return {
    title: identity?.serviceName ?? state.query.serviceName ?? entity?.name ?? t('services.title'),
    description: `${t('services.environment')}: ${identity?.deploymentEnvironment ?? entity?.environment ?? state.query.environment ?? t('services.unknown')}`
  };
}

function ServiceViewSwitch({ state, actions }: ServicesViewProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.viewSwitch}>
      <Segmented
        aria-label={t('services.directory')}
        value={state.query.view ?? 'performance'}
        options={(['performance', 'registered'] as const).map(value => ({
          value,
          label: t(`services.${value}`)
        }))}
        onChange={view => actions.directoryQuery({ view, sort: undefined, order: undefined })}
      />
    </div>
  );
}
