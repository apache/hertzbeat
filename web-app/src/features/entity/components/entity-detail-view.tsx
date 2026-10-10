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

import { Alert, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalCommandBar,
  OperationalPage,
  OperationalPageHeader,
  OperationalStatePanel
} from '@/shared/operational-page';

import type { EntityDetailEvidence, EntityMonitorViewState, EntityNoiseControlType } from '../model/entity-view-model';
import type { EntitySignalViewState } from '../model/entity-signal-view-model';
import { entityExploreSignals, type EntityExploreSignal } from '../model/entity-operational-navigation';
import type { EntityMonitorQuery, EntityNextActionType } from '../model/entity-contract';
import { entityNextActionRequiresWrite } from '../model/entity-operational-navigation';
import { EntityDetailContext } from './entity-detail-context';
import { EntityDetailNavigation, EntityDetailSection } from './entity-detail-navigation';
import { EntityDetailMetadata } from './entity-detail-metadata';
import { DegradedEntityDetail } from './entity-detail-degraded';
import { EntityEvidenceLists } from './entity-evidence-lists';
import { EntityNoiseControlEvidence } from './entity-noise-control-evidence';
import { EntityOperationalGuidance } from './entity-operational-guidance';
import { EntitySignalView } from './entity-signal-view';

type EntityDetailViewActions = {
  refresh: () => void;
  back: () => void;
  edit: () => void;
  definition: () => void;
  explore: (signal: EntityExploreSignal) => void;
  topology: () => void;
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
    signals?: EntitySignalViewState | undefined;
    deleting: boolean;
    deleteFailure?: 'permission' | 'validation' | 'unavailable' | 'error';
  };
  actions: EntityDetailViewActions;
}) {
  const { t } = useTranslation();
  const evidence = state.evidence;
  if (evidence.kind === 'degraded') {
    return <DegradedEntityDetail entity={evidence.entity} state={state} actions={actions} signals={state.signals} />;
  }
  if (evidence.kind !== 'ready') {
    const stateCopy = {
      loading: { kind: 'loading', title: t('entity.loading') },
      missing: { kind: 'empty', title: t('common.notFound.description') },
      permission: { kind: 'permission', title: t('common.permission.roleRequiredDescription') },
      unavailable: { kind: 'unavailable', title: t('common.unavailable') },
      error: { kind: 'error', title: t('common.routeError.description') }
    } as const;
    return (
      <OperationalPage>
        <OperationalStatePanel {...stateCopy[evidence.kind]} />
      </OperationalPage>
    );
  }
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
    signals?: EntitySignalViewState | undefined;
    deleteFailure?: 'permission' | 'validation' | 'unavailable' | 'error';
  };
  actions: EntityDetailViewActions;
}) {
  const { t } = useTranslation();
  const chapters = readyChapters(detail, state.canWrite, Boolean(state.signals));
  return (
    <OperationalPage mode="workspace">
      <EntityDetailHeader detail={detail} state={state} actions={actions} />
      <EntityDetailNavigation chapters={chapters} />
      {state.deleteFailure ? (
        <Alert showIcon type="error" message={t(`entity.delete.failure.${state.deleteFailure}`)} />
      ) : null}
      {state.signals ? (
        <EntityDetailSection id="entity-signals" label={t('entity.signals.title')}>
          <EntitySignalView state={state.signals} openSignal={actions.explore} openTopology={actions.topology} />
        </EntityDetailSection>
      ) : null}
      <EntityDetailMetadata detail={detail} />
      {chapters.some(chapter => chapter.id === 'entity-operations') ? (
        <EntityDetailSection id="entity-operations" label={t('entity.operations.title')}>
          <EntityOperationalGuidance detail={detail} canWrite={state.canWrite} act={actions.nextAction} />
        </EntityDetailSection>
      ) : null}
      {detail.noiseControls ? (
        <EntityDetailSection id="entity-noise" label={t('entity.noiseControls.title')}>
          <EntityNoiseControlEvidence summary={detail.noiseControls} manage={actions.manageNoiseControls} />
        </EntityDetailSection>
      ) : null}
      <EntityEvidenceLists detail={detail} monitors={state.monitors} actions={actions} />
    </OperationalPage>
  );
}

type EntityDetailHeaderProps = {
  detail: Extract<EntityDetailEvidence, { kind: 'ready' }>['detail'];
  state: {
    deleting: boolean;
    refreshing: boolean;
    canWrite: boolean;
    canDelete: boolean;
  };
  actions: EntityDetailViewActions;
};

function EntityDetailHeader({ detail, state, actions }: EntityDetailHeaderProps) {
  const { t } = useTranslation();
  const exploreSignals = entityExploreSignals(detail);
  return (
    <>
      <OperationalPageHeader
        title={detail.entity.displayName || detail.entity.name}
        description={<EntityDetailContext entity={detail.entity} status={detail.status} />}
        actions={
          <Space wrap>
            <Button disabled={state.refreshing} loading={state.refreshing} onClick={actions.refresh}>
              {t('common.refresh')}
            </Button>
            <Button onClick={actions.back}>{t('common.back')}</Button>
          </Space>
        }
      />
      <OperationalCommandBar
        primary={
          <Space wrap>
            {state.canWrite ? (
              <>
                <Button onClick={actions.edit}>{t('common.edit')}</Button>
                <Button onClick={actions.definition}>{t('entity.definition.action')}</Button>
              </>
            ) : null}
            <Button onClick={actions.topology}>{t('entity.topology.view')}</Button>
            {exploreSignals.map(signal => (
              <Button key={signal} onClick={() => actions.explore(signal)}>
                {t(`entity.explore.${signal}`)}
              </Button>
            ))}
          </Space>
        }
        secondary={
          state.canDelete ? (
            <Button danger disabled={state.deleting} loading={state.deleting} onClick={actions.remove}>
              {t('entity.delete.action')}
            </Button>
          ) : undefined
        }
      />
    </>
  );
}

function readyChapters(
  detail: Extract<EntityDetailEvidence, { kind: 'ready' }>['detail'],
  canWrite: boolean,
  signals: boolean
) {
  return [
    ...(signals ? [{ id: 'entity-signals', label: 'entity.signals.title' }] : []),
    { id: 'entity-details', label: 'entity.sections.details' },
    { id: 'entity-evidence', label: 'entity.sections.evidence' },
    ...((detail.nextActions ?? []).some(action => canWrite || !entityNextActionRequiresWrite(action.actionType))
      ? [{ id: 'entity-operations', label: 'entity.operations.title' }]
      : []),
    ...(detail.noiseControls ? [{ id: 'entity-noise', label: 'entity.noiseControls.title' }] : []),
    { id: 'entity-identities', label: 'entity.sections.identities' },
    { id: 'entity-monitors', label: 'entity.sections.monitors' },
    { id: 'entity-relations', label: 'entity.sections.relations' }
  ];
}
