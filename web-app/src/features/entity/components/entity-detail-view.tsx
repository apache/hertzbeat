/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Empty, List, Space, Spin, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EntityDetailEvidence, EntityExploreSignal } from '../model/entity-view-model';
import { entityExploreSignals } from '../model/entity-view-model';
import { localizeEntityCode } from '../model/entity-display';
import { EntityDetailMetadata } from './entity-detail-metadata';
import { EntityNoiseControlEvidence } from './entity-noise-control-evidence';
import styles from './entity-view.module.css';

export function EntityDetailView({
  state,
  actions
}: {
  state: {
    evidence: EntityDetailEvidence;
    deleting: boolean;
    deleteFailure?: 'permission' | 'validation' | 'unavailable' | 'error';
  };
  actions: {
    back: () => void;
    edit: () => void;
    definition: () => void;
    explore: (signal: EntityExploreSignal) => void;
    remove: () => void;
  };
}) {
  const { t } = useTranslation();
  const evidence = state.evidence;
  if (evidence.kind === 'loading')
    return (
      <div role="status">
        <Spin />
      </div>
    );
  if (evidence.kind === 'missing') return <Empty description={t('common.notFound.description')} />;
  if (evidence.kind === 'unavailable') return <Alert showIcon type="warning" message={t('common.unavailable')} />;
  if (evidence.kind === 'error') return <Alert showIcon type="error" message={t('common.routeError.description')} />;
  return <ReadyEntityDetail detail={evidence.detail} state={state} actions={actions} />;
}

function ReadyEntityDetail({
  detail,
  state,
  actions
}: {
  detail: Extract<EntityDetailEvidence, { kind: 'ready' }>['detail'];
  state: { deleting: boolean; deleteFailure?: 'permission' | 'validation' | 'unavailable' | 'error' };
  actions: {
    back: () => void;
    edit: () => void;
    definition: () => void;
    explore: (signal: EntityExploreSignal) => void;
    remove: () => void;
  };
}) {
  const { t } = useTranslation();
  const signals = entityExploreSignals(detail);
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{detail.entity.displayName || detail.entity.name}</Typography.Title>
          <Typography.Text type="secondary">{localizeEntityCode(t, 'type', detail.entity.type)}</Typography.Text>
        </div>
        <Space>
          <Button type="primary" onClick={actions.edit}>
            {t('common.edit')}
          </Button>
          <Button onClick={actions.definition}>{t('entity.definition.action')}</Button>
          <Button danger disabled={state.deleting} loading={state.deleting} onClick={actions.remove}>
            {t('entity.delete.action')}
          </Button>
          {signals.map(signal => (
            <Button key={signal} onClick={() => actions.explore(signal)}>
              {t(`entity.explore.${signal}`)}
            </Button>
          ))}
          <Button onClick={actions.back}>{t('common.back')}</Button>
        </Space>
      </header>
      {state.deleteFailure ? (
        <Alert showIcon type="error" message={t(`entity.delete.failure.${state.deleteFailure}`)} />
      ) : null}
      <EntityDetailMetadata detail={detail} />
      {detail.noiseControls ? <EntityNoiseControlEvidence summary={detail.noiseControls} /> : null}
      <EntityEvidenceLists detail={detail} />
    </div>
  );
}

function EntityEvidenceLists({ detail }: { detail: Extract<EntityDetailEvidence, { kind: 'ready' }>['detail'] }) {
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
      <EvidenceSection
        title={t('entity.sections.monitors')}
        empty={t('entity.missing.monitors')}
        isEmpty={detail.boundMonitors.length === 0}
      >
        <List size="small" dataSource={detail.boundMonitors} renderItem={monitorItem} />
      </EvidenceSection>
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

function identityItem(
  t: (key: string) => string,
  item: Extract<EntityDetailEvidence, { kind: 'ready' }>['detail']['identities'][number]
) {
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

function monitorItem(item: Extract<EntityDetailEvidence, { kind: 'ready' }>['detail']['boundMonitors'][number]) {
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

function relationItem(
  t: (key: string) => string,
  item: Extract<EntityDetailEvidence, { kind: 'ready' }>['detail']['relations'][number]
) {
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
