/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Input, List, Pagination, Select, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar, OperationalSection, OperationalStatePanel } from '@/shared/operational-page';

import type { EntityMonitorQuery } from '../model/entity-contract';
import { entityMonitorStatuses } from '../model/entity-monitor-query';
import type { EntityDetailEvidence, EntityMonitorViewState } from '../model/entity-view-model';
import { localizeEntityCode } from '../model/entity-display';

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
    <OperationalSection title={t('entity.sections.monitors')}>
      <OperationalCommandBar
        primary={
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
          </Space>
        }
        secondary={
          <Button disabled={state.refreshing} loading={state.refreshing} onClick={actions.refreshMonitors}>
            {t('common.refresh')}
          </Button>
        }
      />
      <MonitorEvidence state={state} changePage={actions.changeMonitorPage} />
    </OperationalSection>
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
  if (evidence.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('entity.monitors.loading')} />;
  if (evidence.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('entity.missing.monitors')} />;
  if (evidence.kind === 'permission')
    return <OperationalStatePanel kind="permission" title={t('common.permission.roleRequiredDescription')} />;
  if (evidence.kind === 'unavailable')
    return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  if (evidence.kind === 'error')
    return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
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
    <OperationalSection title={props.title}>
      {props.isEmpty ? <OperationalStatePanel kind="empty" title={props.empty} /> : props.children}
    </OperationalSection>
  );
}
