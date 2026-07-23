/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Empty, Space, Spin, Statistic, Typography } from 'antd';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { TopologyPageController } from '../controller/use-topology-page-controller';
import { formatTopologyWindow } from '../model/topology-display';
import type { TopologyPresentation } from '../model/topology-view-model';
import { TopologyCanvas, type TopologyCanvasHandle, type TopologyCanvasRuntimeState } from './topology-canvas';
import { TopologyDetailRail } from './topology-detail-rail';
import { TopologyMetricTable } from './topology-metric-table';
import { TopologyToolbar } from './topology-toolbar';
import styles from './topology-page.module.css';

export type TopologyPageViewProps = {
  state: Omit<TopologyPageController['state'], 'interaction'>;
  actions: TopologyPageController['actions'];
  interaction: TopologyPageController['state']['interaction'];
  canvasRef?: RefObject<TopologyCanvasHandle | null>;
  runtimeState?: TopologyCanvasRuntimeState;
  onRuntimeStateChange?: (state: TopologyCanvasRuntimeState) => void;
  onFit: () => void;
  onRefresh: () => void;
};

export function TopologyPageView({
  state,
  actions,
  interaction,
  canvasRef,
  runtimeState = { kind: 'loading' },
  onRuntimeStateChange = () => undefined,
  onFit,
  onRefresh
}: TopologyPageViewProps) {
  const { t } = useTranslation();
  const evidence = state.evidence;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('topology.title')}</Typography.Title>
        {evidence.kind === 'ready' ? <TopologySummary state={state} /> : null}
      </header>
      {state.query ? (
        <TopologyToolbar
          query={state.query}
          refreshing={state.refreshing}
          changeScope={actions.changeScope}
          onFit={onFit}
          onRefresh={onRefresh}
        />
      ) : null}
      <TopologyEvidence
        state={state}
        actions={actions}
        interaction={interaction}
        canvasRef={canvasRef}
        runtimeState={runtimeState}
        onRuntimeStateChange={onRuntimeStateChange}
      />
    </div>
  );
}

function TopologyEvidence(props: Omit<TopologyPageViewProps, 'onFit' | 'onRefresh'>) {
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
    return <Alert showIcon type={type} message={t(`topology.evidence.${state.evidence.kind}`)} />;
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
  presentation
}: Omit<TopologyPageViewProps, 'onFit' | 'onRefresh'> & {
  presentation: TopologyPresentation;
}) {
  const { t } = useTranslation();
  return (
    <>
      {state.refreshFailure ? <Alert showIcon type="warning" message={t('topology.evidence.refreshFailure')} /> : null}
      {runtimeState.kind !== 'ready' ? (
        <Alert
          showIcon
          type={runtimeState.kind === 'failure' ? 'error' : 'info'}
          message={t(`topology.evidence.runtime${runtimeState.kind === 'failure' ? 'Failure' : 'Loading'}`)}
        />
      ) : null}
      <div className={styles.workspace}>
        <main className={styles.graphColumn}>
          <div className={styles.canvasFrame}>
            <TopologyCanvas
              ref={canvasRef}
              presentation={presentation}
              interaction={interaction}
              onClearSelection={actions.clearSelection}
              onEdgeHover={edgeId => (edgeId ? actions.hoverEdge(edgeId) : actions.clearHover())}
              onEdgeSelect={actions.selectEdge}
              onNodeHover={nodeId => (nodeId ? actions.hoverNode(nodeId) : actions.clearHover())}
              onNodeSelect={actions.selectNode}
              onRuntimeStateChange={onRuntimeStateChange}
            />
          </div>
          <TopologyMetricTable
            rows={presentation.metricRows}
            interaction={interaction}
            edgeCount={presentation.summary.edgeCount}
            pageIndex={state.query?.pageIndex ?? 0}
            pageSize={state.query?.pageSize ?? 25}
            actions={actions}
          />
        </main>
        <TopologyDetailRail presentation={presentation} interaction={interaction} />
      </div>
    </>
  );
}

function TopologySummary({ state }: { state: TopologyPageViewProps['state'] }) {
  const { i18n, t } = useTranslation();
  if (state.evidence.kind !== 'ready') return null;
  const { summary } = state.evidence.presentation;
  const window = state.query?.window;
  return (
    <Space size="large">
      <Statistic title={t('topology.summary.nodes')} value={summary.nodeCount} />
      <Statistic title={t('topology.summary.edges')} value={summary.edgeCount} />
      <Statistic
        title={t('topology.summary.window')}
        value={formatTopologyWindow(window, i18n.resolvedLanguage || i18n.language)}
      />
    </Space>
  );
}
