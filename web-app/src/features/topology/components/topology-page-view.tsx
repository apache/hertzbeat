/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Empty, Space, Spin, Typography } from 'antd';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { TopologyPageActions, TopologyPageState } from '../model/topology-page-contract';
import { entityRelationTopologySource } from '../model/topology-model';
import type { TopologyPresentation } from '../model/topology-view-model';
import type { TopologyCanvasHandle, TopologyCanvasRuntimeState } from './topology-canvas';
import { TopologyContextBand } from './topology-context-band';
import { TopologyInspector } from './topology-detail-rail';
import { TopologyGraphColumn } from './topology-graph-column';
import { useCompactTopologyInspector } from './use-compact-topology-inspector';
import styles from './topology-page.module.css';

export type TopologyPageViewProps = {
  state: Omit<TopologyPageState, 'interaction'>;
  actions: TopologyPageActions;
  interaction: TopologyPageState['interaction'];
  canvasRef?: RefObject<TopologyCanvasHandle | null>;
  runtimeState?: TopologyCanvasRuntimeState;
  onRuntimeStateChange?: (state: TopologyCanvasRuntimeState) => void;
  scale: number;
  onFit: () => void;
  onRefresh: () => void;
  onScaleChange?: (scale: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function TopologyPageView({
  state,
  actions,
  interaction,
  canvasRef,
  runtimeState = { kind: 'loading' },
  onRuntimeStateChange = () => undefined,
  scale,
  onFit,
  onRefresh,
  onScaleChange = () => undefined,
  onZoomIn,
  onZoomOut
}: TopologyPageViewProps) {
  const { t } = useTranslation();
  const evidence = state.evidence;
  return (
    <div className={styles.page}>
      {evidence.kind === 'ready' ? (
        <TopologyContextBand presentation={evidence.presentation} query={state.query} />
      ) : (
        <header className={styles.heading}>
          <Typography.Title level={2}>{t('topology.title')}</Typography.Title>
        </header>
      )}
      <TopologyEvidence
        state={state}
        actions={actions}
        interaction={interaction}
        {...(canvasRef ? { canvasRef } : {})}
        runtimeState={runtimeState}
        onRuntimeStateChange={onRuntimeStateChange}
        scale={scale}
        onFit={onFit}
        onRefresh={onRefresh}
        onScaleChange={onScaleChange}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
    </div>
  );
}

function TopologyEvidence(props: TopologyPageViewProps) {
  const { t } = useTranslation();
  const { state } = props;
  if (state.evidence.kind === 'loading') {
    return (
      <div className={styles.centerEvidence} role="status">
        <Spin />
        <Typography.Text>{t('topology.evidence.loading')}</Typography.Text>
      </div>
    );
  }
  if (state.evidence.kind === 'empty') {
    return <Empty description={t('topology.evidence.empty')} />;
  }
  if (state.evidence.kind !== 'ready') {
    const type = state.evidence.kind === 'permission' || state.evidence.kind === 'unavailable' ? 'warning' : 'error';
    const recoverable = state.evidence.kind === 'unavailable' || state.evidence.kind === 'error';
    return (
      <Alert
        showIcon
        type={type}
        message={t(`topology.evidence.${state.evidence.kind}`)}
        action={
          recoverable ? (
            <Space>
              <Button size="small" onClick={props.onRefresh}>
                {t('common.retry')}
              </Button>
              {state.evidence.kind === 'unavailable' && state.query?.sourceKind !== entityRelationTopologySource ? (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => props.actions.changeScope({ sourceKind: entityRelationTopologySource })}
                >
                  {t('topology.evidence.useEntityRelations')}
                </Button>
              ) : null}
            </Space>
          ) : undefined
        }
      />
    );
  }
  return <ReadyTopology {...props} presentation={state.evidence.presentation} />;
}

function ReadyTopology({
  state,
  actions,
  interaction,
  canvasRef,
  runtimeState = { kind: 'loading' },
  onRuntimeStateChange = () => undefined,
  scale,
  onFit,
  onRefresh,
  onScaleChange = () => undefined,
  onZoomIn,
  onZoomOut,
  presentation
}: TopologyPageViewProps & {
  presentation: TopologyPresentation;
}) {
  const compactInspector = useCompactTopologyInspector();
  const workspaceClass = [styles.workspace, compactInspector ? styles.workspaceCompact : undefined]
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <TopologyReadyEvidence
        refreshFailure={state.refreshFailure}
        presentation={presentation}
        runtimeState={runtimeState}
      />
      <div className={workspaceClass}>
        <TopologyGraphColumn
          state={state}
          actions={actions}
          interaction={interaction}
          {...(canvasRef ? { canvasRef } : {})}
          presentation={presentation}
          scale={scale}
          onFit={onFit}
          onRefresh={onRefresh}
          onRuntimeStateChange={onRuntimeStateChange}
          onScaleChange={onScaleChange}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
        />
        <TopologyInspector
          compact={compactInspector}
          presentation={presentation}
          interaction={interaction}
          query={state.query}
          actions={actions}
          onClose={actions.clearSelection}
        />
      </div>
    </>
  );
}

function TopologyReadyEvidence({
  refreshFailure,
  presentation,
  runtimeState
}: {
  refreshFailure: TopologyPageViewProps['state']['refreshFailure'];
  presentation: TopologyPresentation;
  runtimeState: TopologyCanvasRuntimeState;
}) {
  const { t } = useTranslation();
  return (
    <>
      {refreshFailure ? <Alert showIcon type="warning" message={t('topology.evidence.refreshFailure')} /> : null}
      {presentation.summary.partial ? (
        <Alert
          showIcon
          type="warning"
          message={t('topology.partial.title')}
          description={
            <ul>
              {presentation.summary.partialReasons.map(reason => (
                <li key={reason}>
                  {t(reason === 'entity_seed_limit' ? 'topology.partial.entitySeedLimit' : 'topology.partial.edgePage')}
                </li>
              ))}
            </ul>
          }
        />
      ) : null}
      <TopologyRuntimeEvidence state={runtimeState} />
    </>
  );
}

function TopologyRuntimeEvidence({ state }: { state: TopologyCanvasRuntimeState }) {
  const { t } = useTranslation();
  if (state.kind === 'ready') return null;
  return (
    <Alert
      showIcon
      type={state.kind === 'failure' ? 'error' : 'info'}
      message={t(`topology.evidence.runtime${state.kind === 'failure' ? 'Failure' : 'Loading'}`)}
    />
  );
}
