/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { List, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalSection, OperationalStatePanel } from '@/shared/operational-page';

import type { EntityMonitorQuery } from '../model/entity-contract';
import type { EntityDetailEvidence, EntityMonitorViewState } from '../model/entity-view-model';
import { localizeEntityCode } from '../model/entity-display';
import { EntityDetailSection } from './entity-detail-navigation';
import { EntityMonitorSection } from './entity-monitor-section';

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
        id="entity-identities"
        title={t('entity.sections.identities')}
        empty={t('entity.missing.identities')}
        isEmpty={detail.identities.length === 0}
      >
        <List size="small" dataSource={detail.identities} renderItem={item => identityItem(t, item)} />
      </EvidenceSection>
      <EntityMonitorSection state={monitors} actions={actions} />
      <EvidenceSection
        id="entity-relations"
        title={t('entity.sections.relations')}
        empty={t('entity.missing.relations')}
        isEmpty={detail.relations.length === 0}
      >
        <List size="small" dataSource={detail.relations} renderItem={item => relationItem(t, item)} />
      </EvidenceSection>
    </>
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

function EvidenceSection(props: {
  id: string;
  title: string;
  empty: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <EntityDetailSection id={props.id} label={props.title}>
      <OperationalSection title={props.title}>
        {props.isEmpty ? <OperationalStatePanel kind="empty" title={props.empty} /> : props.children}
      </OperationalSection>
    </EntityDetailSection>
  );
}
