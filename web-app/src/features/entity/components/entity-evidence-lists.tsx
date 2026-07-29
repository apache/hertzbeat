/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Empty, Input, List, Pagination, Select, Space, Spin, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EntityMonitorQuery } from '../model/entity-contract';
import { entityMonitorStatuses } from '../model/entity-monitor-query';
import type { EntityDetailEvidence, EntityMonitorViewState } from '../model/entity-view-model';
import { localizeEntityCode } from '../model/entity-display';
import styles from './entity-view.module.css';

type Detail = Extract<EntityDetailEvidence, { kind: 'ready' }>['detail'];
type MonitorActions = {
  changeMonitorPage: (pageIndex: number) => void;
  changeMonitorFilters: (filters: Pick<EntityMonitorQuery, 'status' | 'app'>) => void;
  refreshMonitors: () => void;
};

export function EntityEvidenceLists({
  detail,
  monitors,
  actions
}: {
  detail: Detail;
  monitors: EntityMonitorViewState;
  actions: MonitorActions;
}) {
  const { t } = useTranslation();
  return (
    <>
      <EvidenceSection
        title={t('entity.sections.identities')}
        empty={t('entity.missing.identities')}
        isEmpty={detail.identities.length === 0}
      >
        <List size="small" dataSource={detail.identities} renderItem={item => identityItem(t, item)} />
      </EvidenceSection>
      <MonitorSection state={monitors} actions={actions} />
      <EvidenceSection
        title={t('entity.sections.relations')}
        empty={t('entity.missing.relations')}
        isEmpty={detail.relations.length === 0}
      >
        <List size="small" dataSource={detail.relations} renderItem={item => relationItem(t, item)} />
      </EvidenceSection>
    </>
  );
}

function MonitorSection({ state, actions }: { state: EntityMonitorViewState; actions: MonitorActions }) {
  const { t } = useTranslation();
  return (
    <section className={styles.section} aria-label={t('entity.sections.monitors')}>
      <Typography.Title level={4}>{t('entity.sections.monitors')}</Typography.Title>
      <Space wrap>
        <Input.Search
          key={state.query.app ?? ''}
          defaultValue={state.query.app}
          allowClear
          aria-label={t('entity.monitors.app')}
          placeholder={t('entity.monitors.app')}
          onSearch={app =>
            actions.changeMonitorFilters({
              ...(state.query.status === undefined ? {} : { status: state.query.status }),
              ...(app ? { app } : {})
            })
          }
        />
        <Select
          aria-label={t('monitor.status.label')}
          value={state.query.status ?? 'all'}
          onChange={(status: number | 'all') =>
            actions.changeMonitorFilters({
              ...(status === 'all' ? {} : { status }),
              ...(state.query.app ? { app: state.query.app } : {})
            })
          }
          options={monitorStatusOptions(t)}
        />
        <Button onClick={() => actions.changeMonitorFilters({})}>{t('entity.monitors.reset')}</Button>
        <Button disabled={state.refreshing} loading={state.refreshing} onClick={actions.refreshMonitors}>
          {t('common.refresh')}
        </Button>
      </Space>
      <MonitorEvidence state={state} changePage={actions.changeMonitorPage} />
    </section>
  );
}

function monitorStatusOptions(t: (key: string) => string): { value: number | 'all'; label: string }[] {
  return [
    { value: 'all', label: t('monitor.status.all') },
    ...entityMonitorStatuses.map(value => ({ value, label: t(entityMonitorStatusKey(value)) }))
  ];
}

function entityMonitorStatusKey(status: number) {
  if (status === 0) return 'monitor.status.paused';
  if (status === 1) return 'monitor.status.available';
  return 'monitor.status.unavailable';
}

function MonitorEvidence({
  state,
  changePage
}: {
  state: EntityMonitorViewState;
  changePage: (pageIndex: number) => void;
}) {
  const { t } = useTranslation();
  const evidence = state.evidence;
  if (evidence.kind === 'loading') return <Spin />;
  if (evidence.kind === 'empty')
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('entity.missing.monitors')} />;
  if (evidence.kind === 'permission')
    return <Alert showIcon type="warning" message={t('common.permission.roleRequiredDescription')} />;
  if (evidence.kind === 'unavailable') return <Alert showIcon type="warning" message={t('common.unavailable')} />;
  if (evidence.kind === 'error') return <Alert showIcon type="error" message={t('common.routeError.description')} />;
  const start = state.query.pageIndex * state.query.pageSize + 1;
  const end = Math.min(start + evidence.records.length - 1, evidence.total);
  return (
    <>
      <List size="small" dataSource={evidence.records} renderItem={monitorItem} />
      <Space>
        <Typography.Text>{t('entity.monitors.range', { start, end, total: evidence.total })}</Typography.Text>
        <Pagination
          current={state.query.pageIndex + 1}
          pageSize={state.query.pageSize}
          showSizeChanger={false}
          total={evidence.total}
          onChange={page => changePage(page - 1)}
        />
      </Space>
    </>
  );
}

function monitorItem(item: Detail['monitorPreview']['items'][number]) {
  return (
    <List.Item>
      <Space>
        <strong>{item.name}</strong>
        <Tag>{item.app}</Tag>
        <span>{item.instance || '—'}</span>
      </Space>
    </List.Item>
  );
}

function identityItem(t: (key: string) => string, item: Detail['identities'][number]) {
  return (
    <List.Item>
      <Space>
        <Tag>{localizeEntityCode(t, 'identityType', item.identityType)}</Tag>
        <strong>{item.identityKey}</strong>
        <span>{item.identityValue}</span>
      </Space>
    </List.Item>
  );
}

function relationItem(t: (key: string) => string, item: Detail['relations'][number]) {
  return (
    <List.Item>
      <Space>
        <Tag>{localizeEntityCode(t, 'direction', item.direction)}</Tag>
        <strong>{item.relationType || '—'}</strong>
        <span>{item.entityName || item.targetRef || '—'}</span>
      </Space>
    </List.Item>
  );
}

function EvidenceSection(props: { title: string; empty: string; isEmpty: boolean; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <Typography.Title level={4}>{props.title}</Typography.Title>
      {props.isEmpty ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={props.empty} /> : props.children}
    </section>
  );
}
