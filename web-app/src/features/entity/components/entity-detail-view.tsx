/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Empty, Space, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EntityDetailEvidence, EntityMonitorViewState, EntityNoiseControlType } from '../model/entity-view-model';
import { entityExploreSignals, type EntityExploreSignal } from '../model/entity-operational-navigation';
import type { EntityMonitorQuery, EntityNextActionType } from '../model/entity-contract';
import { localizeEntityCode } from '../model/entity-display';
import { EntityDetailMetadata } from './entity-detail-metadata';
import { EntityEvidenceLists } from './entity-evidence-lists';
import { EntityNoiseControlEvidence } from './entity-noise-control-evidence';
import { EntityOperationalGuidance } from './entity-operational-guidance';
import styles from './entity-view.module.css';

type EntityDetailViewActions = {
  refresh: () => void;
  back: () => void;
  edit: () => void;
  definition: () => void;
  explore: (signal: EntityExploreSignal) => void;
  manageNoiseControls: (ruleType: EntityNoiseControlType) => void;
  changeMonitorPage: (pageIndex: number) => void;
  changeMonitorFilters: (filters: Pick<EntityMonitorQuery, 'status' | 'app'>) => void;
  refreshMonitors: () => void;
  nextAction: (action: EntityNextActionType) => void;
  remove: () => void;
};

export function EntityDetailView({
  state,
  actions
}: {
  state: {
    evidence: EntityDetailEvidence;
    refreshing: boolean;
    canWrite: boolean;
    canDelete: boolean;
    monitors: EntityMonitorViewState;
    deleting: boolean;
    deleteFailure?: 'permission' | 'validation' | 'unavailable' | 'error';
  };
  actions: EntityDetailViewActions;
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
  if (evidence.kind === 'permission')
    return <Alert showIcon type="warning" message={t('common.permission.roleRequiredDescription')} />;
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
  state: {
    deleting: boolean;
    refreshing: boolean;
    canWrite: boolean;
    canDelete: boolean;
    monitors: EntityMonitorViewState;
    deleteFailure?: 'permission' | 'validation' | 'unavailable' | 'error';
  };
  actions: EntityDetailViewActions;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <EntityDetailHeader detail={detail} state={state} actions={actions} />
      {state.deleteFailure ? (
        <Alert showIcon type="error" message={t(`entity.delete.failure.${state.deleteFailure}`)} />
      ) : null}
      <EntityDetailMetadata detail={detail} />
      <EntityOperationalGuidance detail={detail} canWrite={state.canWrite} act={actions.nextAction} />
      {detail.noiseControls ? (
        <EntityNoiseControlEvidence summary={detail.noiseControls} manage={actions.manageNoiseControls} />
      ) : null}
      <EntityEvidenceLists detail={detail} monitors={state.monitors} actions={actions} />
    </div>
  );
}

function EntityDetailHeader({
  detail,
  state,
  actions
}: {
  detail: Extract<EntityDetailEvidence, { kind: 'ready' }>['detail'];
  state: { deleting: boolean; refreshing: boolean; canWrite: boolean; canDelete: boolean };
  actions: EntityDetailViewActions;
}) {
  const { t } = useTranslation();
  return (
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{detail.entity.displayName || detail.entity.name}</Typography.Title>
        <Typography.Text type="secondary">{localizeEntityCode(t, 'type', detail.entity.type)}</Typography.Text>
      </div>
      <Space>
        {state.canWrite && (
          <>
            <Button type="primary" onClick={actions.edit}>
              {t('common.edit')}
            </Button>
            <Button onClick={actions.definition}>{t('entity.definition.action')}</Button>
          </>
        )}
        {state.canDelete && (
          <Button danger disabled={state.deleting} loading={state.deleting} onClick={actions.remove}>
            {t('entity.delete.action')}
          </Button>
        )}
        {entityExploreSignals(detail).map(signal => (
          <Button key={signal} onClick={() => actions.explore(signal)}>
            {t(`entity.explore.${signal}`)}
          </Button>
        ))}
        <Button disabled={state.refreshing} loading={state.refreshing} onClick={actions.refresh}>
          {t('common.refresh')}
        </Button>
        <Button onClick={actions.back}>{t('common.back')}</Button>
      </Space>
    </header>
  );
}
